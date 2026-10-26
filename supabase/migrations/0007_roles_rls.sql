-- 역할 분기 (profiles.email, is_admin, RLS, import_apply 관리자 확인, set_user_role)

-- ---------------------------------------------------------------
-- 프로필 이메일 (사용자 목록에 이메일을 보이기 위해)
-- ---------------------------------------------------------------
alter table public.profiles add column email text;

-- 새 사용자의 이메일도 프로필에 채운다. 표시 이름 기본값과 첫 사용자 관리자 로직은 0004 와 같다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- 첫 사용자 두 명이 동시에 생겨도 관리자가 한 명만 되도록 직렬화한다.
  perform pg_advisory_xact_lock(hashtext('public.profiles.first_admin'));

  insert into public.profiles (id, display_name, email, role)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(new.email, '@', 1), '')
    ),
    new.email,
    case when exists (select 1 from public.profiles) then 'worker' else 'admin' end
  );
  return new;
end;
$$;

-- 기존 프로필의 이메일을 auth.users 에서 채운다.
update public.profiles p set email = u.email from auth.users u where u.id = p.id;

-- ---------------------------------------------------------------
-- 관리자 확인
-- ---------------------------------------------------------------
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------
-- RLS 정책 (품목, 위치, 사진 업로드는 관리자만 쓴다. 조회 정책은 그대로이다)
-- profiles 는 0002 에서 insert, update, delete 권한과 정책을 모두 회수했으므로
-- 클라이언트가 role 을 직접 바꿀 수 없다. role 변경은 set_user_role 로만 한다.
-- ---------------------------------------------------------------
drop policy locations_insert on public.locations;
create policy locations_insert on public.locations
  for insert to authenticated with check (public.is_admin());

drop policy locations_update on public.locations;
create policy locations_update on public.locations
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy items_insert on public.items;
create policy items_insert on public.items
  for insert to authenticated with check (public.is_admin());

drop policy items_update on public.items;
create policy items_update on public.items
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy item_photos_insert on storage.objects;
create policy item_photos_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'item-photos' and public.is_admin());

-- ---------------------------------------------------------------
-- 엑셀 가져오기 (0003 본문 그대로, 맨 앞에 관리자 확인 한 줄만 추가한다)
-- 시그니처와 실행 권한은 그대로 유지된다.
-- ---------------------------------------------------------------
create or replace function public.import_apply(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loc_created integer := 0;
  v_loc_total integer;
  v_item_created integer := 0;
  v_item_updated integer := 0;
  v_stock_imported integer := 0;
  v_stock_ignored integer := 0;
  v_parent uuid;
  v_parent_active boolean;
  v_item uuid;
  v_loc uuid;
  v_rows integer;
  v_constraint text;
  r record;
begin
  if not public.is_admin() then
    raise exception '관리자만 가져올 수 있습니다';
  end if;

  if auth.uid() is null then
    raise exception '로그인이 필요합니다' using errcode = '28000';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception '가져오기 데이터 형식이 올바르지 않습니다';
  end if;

  begin
    -- 1) 위치 (없는 코드만 만든다. 상위가 먼저 만들어지도록 깊이 순서로 처리한다)
    select count(*) into v_loc_total
      from (
        select distinct lower(btrim(x.code))
          from jsonb_to_recordset(coalesce(p_payload -> 'locations', '[]'::jsonb))
               as x(code text, name text, parent_code text)
         where not exists (select 1 from public.locations l where lower(l.code) = lower(btrim(x.code)))
      ) t;

    for r in
      with recursive src as (
        select btrim(x.code) as code,
               btrim(x.name) as name,
               nullif(btrim(x.parent_code), '') as parent_code
          from jsonb_to_recordset(coalesce(p_payload -> 'locations', '[]'::jsonb))
               as x(code text, name text, parent_code text)
      ),
      newsrc as (
        select distinct on (lower(s.code)) s.code, s.name, s.parent_code
          from src s
         where not exists (select 1 from public.locations l where lower(l.code) = lower(s.code))
         order by lower(s.code)
      ),
      tree as (
        select n.code, n.name, n.parent_code, 0 as depth
          from newsrc n
         where n.parent_code is null
            or not exists (select 1 from newsrc p where lower(p.code) = lower(n.parent_code))
        union all
        select c.code, c.name, c.parent_code, t.depth + 1
          from newsrc c
          join tree t on lower(c.parent_code) = lower(t.code)
      )
      select tr.code, tr.name, tr.parent_code from tree tr order by tr.depth, lower(tr.code)
    loop
      v_parent := null;
      if r.parent_code is not null then
        select l.id, l.active into v_parent, v_parent_active
          from public.locations l
         where lower(l.code) = lower(r.parent_code);
        if v_parent is null then
          raise exception '존재하지 않는 상위 코드입니다 (%)', r.parent_code;
        end if;
        if not v_parent_active then
          raise exception '보관된 위치입니다 (%)', r.parent_code;
        end if;
      end if;

      insert into public.locations (code, name, parent_id)
      values (r.code, r.name, v_parent);
      v_loc_created := v_loc_created + 1;
    end loop;

    -- 깊이 순서로 만들지 못한 위치가 남으면 상위 지정이 순환이다.
    if v_loc_created <> v_loc_total then
      raise exception '위치의 상위 코드가 순환합니다';
    end if;

    -- 2) 품목 (신규는 만들고, 기존 SKU 는 정보만 갱신한다. 빈 칸은 기존 값을 유지한다)
    for r in
      select distinct on (lower(btrim(x.sku)))
             btrim(x.sku) as sku,
             btrim(x.name) as name,
             nullif(btrim(x.barcode), '') as barcode,
             nullif(btrim(x.unit), '') as unit,
             x.min_qty,
             nullif(btrim(x.memo), '') as memo
        from jsonb_to_recordset(coalesce(p_payload -> 'items', '[]'::jsonb))
             as x(sku text, name text, barcode text, unit text, min_qty numeric, memo text)
       order by lower(btrim(x.sku))
    loop
      if r.sku is null or r.sku = '' then
        raise exception 'SKU가 비어 있습니다';
      end if;
      if r.name is null or r.name = '' then
        raise exception '품목 이름이 비어 있습니다 (%)', r.sku;
      end if;
      if r.min_qty is not null and (r.min_qty < 0 or r.min_qty <> trunc(r.min_qty) or r.min_qty > 2147483647) then
        raise exception '최소 수량은 0 이상의 정수여야 합니다 (%)', r.sku;
      end if;

      select i.id into v_item from public.items i where lower(i.sku) = lower(r.sku);
      if found then
        update public.items
           set name = r.name,
               barcode = coalesce(r.barcode, barcode),
               unit = coalesce(r.unit, unit),
               min_qty = coalesce(r.min_qty::integer, min_qty),
               memo = coalesce(r.memo, memo)
         where id = v_item;
        v_item_updated := v_item_updated + 1;
      else
        insert into public.items (sku, name, barcode, unit, min_qty, memo)
        values (r.sku, r.name, r.barcode, coalesce(r.unit, '개'), coalesce(r.min_qty::integer, 0), r.memo);
        v_item_created := v_item_created + 1;
      end if;
    end loop;

    -- 3) 수량 (stock 행이 없거나 qty 가 0인 조합만 입고 이력으로 남긴다)
    for r in
      select btrim(x.sku) as sku, btrim(x.location_code) as location_code, x.qty
        from jsonb_to_recordset(coalesce(p_payload -> 'stocks', '[]'::jsonb))
             as x(sku text, location_code text, qty numeric)
    loop
      if r.qty is null or r.qty < 0 or r.qty <> trunc(r.qty) or r.qty > 2147483647 then
        raise exception '수량은 0 이상의 정수여야 합니다 (% / %)', r.sku, r.location_code;
      end if;

      select i.id into v_item from public.items i where lower(i.sku) = lower(r.sku);
      if not found then
        raise exception '존재하지 않는 SKU입니다 (%)', r.sku;
      end if;
      select l.id into v_loc from public.locations l where lower(l.code) = lower(r.location_code);
      if not found then
        raise exception '존재하지 않는 위치 코드입니다 (%)', r.location_code;
      end if;

      if r.qty = 0 then
        v_stock_ignored := v_stock_ignored + 1;
        continue;
      end if;

      perform public._check_active(v_item, v_loc);

      -- 기존 수량이 0보다 크면 where 조건이 거짓이라 아무 행도 바뀌지 않는다.
      insert into public.stock as s (item_id, location_id, qty)
      values (v_item, v_loc, r.qty::integer)
      on conflict (item_id, location_id) do update set qty = excluded.qty where s.qty = 0;
      get diagnostics v_rows = row_count;

      if v_rows = 1 then
        insert into public.movements (item_id, location_id, type, delta, reason, created_by)
        values (v_item, v_loc, 'import', r.qty::integer, '초기/가져오기', auth.uid());
        v_stock_imported := v_stock_imported + 1;
      else
        v_stock_ignored := v_stock_ignored + 1;
      end if;
    end loop;
  exception
    when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      raise exception '중복된 값이 있어 가져올 수 없습니다 (%)', v_constraint;
  end;

  return jsonb_build_object(
    'locations_created', v_loc_created,
    'items_created', v_item_created,
    'items_updated', v_item_updated,
    'stocks_imported', v_stock_imported,
    'stocks_ignored', v_stock_ignored
  );
end;
$$;

-- ---------------------------------------------------------------
-- 권한 변경 (관리자만, 마지막 관리자는 작업자로 바꿀 수 없다)
-- ---------------------------------------------------------------
create function public.set_user_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cur text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception '권한이 없습니다';
  end if;
  if p_role is null or p_role not in ('admin', 'worker') then
    raise exception '잘못된 권한입니다';
  end if;

  -- 동시에 서로를 강등해 관리자가 사라지지 않도록 직렬화한다.
  perform pg_advisory_xact_lock(hashtext('public.profiles.first_admin'));

  -- 잠금을 기다리는 사이 호출자가 강등됐을 수 있으므로 다시 확인한다.
  if not public.is_admin() then
    raise exception '권한이 없습니다';
  end if;

  select p.role into v_cur from public.profiles p where p.id = p_user_id for update;
  if not found then
    raise exception '사용자를 찾을 수 없습니다';
  end if;

  if v_cur = 'admin' and p_role = 'worker'
     and (select count(*) from public.profiles p where p.role = 'admin') <= 1 then
    raise exception '마지막 관리자는 작업자로 바꿀 수 없습니다';
  end if;

  update public.profiles set role = p_role where id = p_user_id;
end;
$$;

revoke all on function public.set_user_role(uuid, text) from public, anon;
grant execute on function public.set_user_role(uuid, text) to authenticated;
