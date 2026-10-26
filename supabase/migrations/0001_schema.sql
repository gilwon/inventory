-- 재고 관리 스키마 (테이블, 인덱스, 제약, 트리거)

-- ---------------------------------------------------------------
-- 프로필
-- ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  role text not null default 'worker' check (role in ('admin', 'worker'))
);

-- 새 사용자가 생기면 프로필을 만든다. 첫 프로필이면 관리자 권한을 준다.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- 첫 사용자 두 명이 동시에 생겨도 관리자가 한 명만 되도록 직렬화한다.
  perform pg_advisory_xact_lock(hashtext('public.profiles.first_admin'));

  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    case when exists (select 1 from public.profiles) then 'worker' else 'admin' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 마이그레이션 전에 이미 만들어진 계정이 있으면 프로필을 채운다. 가장 먼저 만든 계정이 관리자이다.
insert into public.profiles (id, role)
select u.id,
       case when row_number() over (order by u.created_at, u.id) = 1 then 'admin' else 'worker' end
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------
-- 위치
-- ---------------------------------------------------------------
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.locations (id),
  code text not null check (btrim(code) <> ''),
  name text not null check (btrim(name) <> ''),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 코드는 대소문자를 무시하고 전체에서 유일하다.
create unique index locations_code_lower_key on public.locations (lower(code));
create index locations_parent_id_idx on public.locations (parent_id);

-- ---------------------------------------------------------------
-- 품목
-- ---------------------------------------------------------------
create table public.items (
  id uuid primary key default gen_random_uuid(),
  sku text not null check (btrim(sku) <> ''),
  name text not null check (btrim(name) <> ''),
  barcode text,
  unit text not null default '개',
  min_qty integer not null default 0 check (min_qty >= 0),
  memo text,
  photo_path text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- SKU와 바코드는 대소문자를 무시하고 유일하다. 바코드는 비어 있어도 된다.
create unique index items_sku_lower_key on public.items (lower(sku));
create unique index items_barcode_lower_key on public.items (lower(barcode)) where barcode is not null;

-- ---------------------------------------------------------------
-- 재고 (이력 합계의 캐시)
-- ---------------------------------------------------------------
create table public.stock (
  item_id uuid not null references public.items (id),
  location_id uuid not null references public.locations (id),
  qty integer not null check (qty >= 0),
  primary key (item_id, location_id)
);

create index stock_location_id_idx on public.stock (location_id);

-- ---------------------------------------------------------------
-- 이력
-- ---------------------------------------------------------------
create table public.movements (
  id bigint generated always as identity primary key,
  item_id uuid not null references public.items (id),
  location_id uuid not null references public.locations (id),
  type text not null check (type in ('receive', 'issue', 'transfer_out', 'transfer_in', 'adjust', 'import')),
  delta integer not null check (delta <> 0),
  reason text,
  group_id uuid,
  reverses_id bigint unique references public.movements (id),
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  -- 조정은 사유가 공백 제외 1자 이상이어야 한다.
  constraint movements_adjust_reason_check
    check (type <> 'adjust' or (reason is not null and btrim(reason) <> '')),
  -- 증감 부호는 유형과 맞아야 한다. 조정은 양쪽 모두 가능하다.
  constraint movements_delta_sign_check
    check (
      type = 'adjust'
      or (type in ('receive', 'transfer_in', 'import') and delta > 0)
      or (type in ('issue', 'transfer_out') and delta < 0)
    )
);

create index movements_item_created_idx on public.movements (item_id, created_at desc);
create index movements_location_created_idx on public.movements (location_id, created_at desc);
create index movements_created_idx on public.movements (created_at desc);
create index movements_group_id_idx on public.movements (group_id) where group_id is not null;

-- ---------------------------------------------------------------
-- 트리거 함수
-- ---------------------------------------------------------------

-- 품목의 SKU와 바코드 앞뒤 공백을 제거하고, 빈 바코드는 null로 바꾼다.
create function public.items_normalize()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.sku := btrim(new.sku);
  new.barcode := nullif(btrim(new.barcode), '');
  return new;
end;
$$;

create trigger items_normalize_trg
  before insert or update on public.items
  for each row execute function public.items_normalize();

-- 위치 코드 앞뒤 공백을 제거한다.
create function public.locations_normalize()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.code := btrim(new.code);
  return new;
end;
$$;

create trigger locations_normalize_trg
  before insert or update on public.locations
  for each row execute function public.locations_normalize();

-- 위치를 자기 자신이나 자기 후손 아래로 옮기지 못하게 한다.
create function public.locations_prevent_cycle()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception '위치를 자기 자신의 하위로 지정할 수 없습니다';
  end if;

  -- 새 상위에서 위로 거슬러 올라가다 자기 자신을 만나면 순환이다.
  if tg_op = 'UPDATE' and exists (
    with recursive up as (
      select l.id, l.parent_id from public.locations l where l.id = new.parent_id
      union all
      select l.id, l.parent_id from public.locations l join up on l.id = up.parent_id
    )
    select 1 from up where up.id = new.id
  ) then
    raise exception '위치를 자기 하위로 옮길 수 없습니다';
  end if;

  return new;
end;
$$;

create trigger locations_prevent_cycle_trg
  before insert or update of parent_id on public.locations
  for each row execute function public.locations_prevent_cycle();

-- 활성 하위 위치나 남은 수량이 있으면 위치를 보관하지 못하게 한다.
create function public.locations_prevent_archive()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.locations c where c.parent_id = new.id and c.active
  ) then
    raise exception '활성 하위 위치가 있어 보관할 수 없습니다';
  end if;

  if exists (
    select 1 from public.stock s where s.location_id = new.id and s.qty > 0
  ) then
    raise exception '수량이 남아 있어 보관할 수 없습니다';
  end if;

  return new;
end;
$$;

create trigger locations_prevent_archive_trg
  before update of active on public.locations
  for each row
  when (old.active and not new.active)
  execute function public.locations_prevent_archive();

-- 어느 위치에든 수량이 남은 품목은 보관하지 못하게 한다.
create function public.items_prevent_archive()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.stock s where s.item_id = new.id and s.qty > 0
  ) then
    raise exception '수량이 남아 있어 보관할 수 없습니다';
  end if;

  return new;
end;
$$;

create trigger items_prevent_archive_trg
  before update of active on public.items
  for each row
  when (old.active and not new.active)
  execute function public.items_prevent_archive();

-- 트리거 함수는 직접 호출 대상이 아니므로 실행 권한을 회수한다.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.items_normalize() from public, anon, authenticated;
revoke all on function public.locations_normalize() from public, anon, authenticated;
revoke all on function public.locations_prevent_cycle() from public, anon, authenticated;
revoke all on function public.locations_prevent_archive() from public, anon, authenticated;
revoke all on function public.items_prevent_archive() from public, anon, authenticated;
