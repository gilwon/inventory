-- RLS 정책, 테이블 권한 회수, 사진 저장소 버킷

alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.items enable row level security;
alter table public.stock enable row level security;
alter table public.movements enable row level security;

-- Supabase 기본 권한이 anon, authenticated 에 모든 권한을 주므로 먼저 전부 회수하고 필요한 것만 다시 준다.
revoke all on public.profiles, public.locations, public.items, public.stock, public.movements
  from anon, authenticated;

grant select on public.profiles, public.locations, public.items, public.stock, public.movements
  to authenticated;

-- 1차에서는 로그인한 모든 사용자가 품목과 위치를 만들고 고칠 수 있다.
-- 2차에서 profiles.role 로 분기해 작업자의 쓰기를 막는다. 계정이 한 명인 동안만 안전하다.
-- delete 권한과 정책은 없다. 품목과 위치는 보관 처리로만 숨긴다.
grant insert, update on public.locations, public.items to authenticated;

-- 조회 정책
create policy profiles_select on public.profiles
  for select to authenticated using (true);

create policy locations_select on public.locations
  for select to authenticated using (true);

create policy items_select on public.items
  for select to authenticated using (true);

create policy stock_select on public.stock
  for select to authenticated using (true);

create policy movements_select on public.movements
  for select to authenticated using (true);

-- 위치와 품목의 쓰기 정책 (1차)
create policy locations_insert on public.locations
  for insert to authenticated with check (true);

create policy locations_update on public.locations
  for update to authenticated using (true) with check (true);

create policy items_insert on public.items
  for insert to authenticated with check (true);

create policy items_update on public.items
  for update to authenticated using (true) with check (true);

-- stock, movements 에는 insert, update, delete 정책과 권한이 없다.
-- 쓰기는 0003 의 security definer 함수만 할 수 있다.

-- ---------------------------------------------------------------
-- 사진 저장소 (비공개, 5MB, 이미지만)
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'item-photos',
  'item-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
);

-- 로그인한 사용자만 읽고, 올리고, 교체할 수 있다. 삭제 정책은 없다.
create policy item_photos_select on storage.objects
  for select to authenticated
  using (bucket_id = 'item-photos');

create policy item_photos_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'item-photos');

create policy item_photos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'item-photos')
  with check (bucket_id = 'item-photos');
