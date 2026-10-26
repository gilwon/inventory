-- items, locations 텍스트 열에 길이 CHECK 추가
-- 한도는 Server Action(items/actions.ts, locations/actions.ts)이 이미 검증하는 최대 길이와 같다.
-- 0001 에는 btrim(...) <> '' 비어 있음 검사만 있고 길이 제약은 없어서 중복되지 않는다.
-- 앱은 JS 문자열 길이(UTF-16 단위)로, DB 는 char_length(문자 수)로 세므로 DB 쪽이 같거나 더 느슨하다.

alter table public.items
  add constraint items_sku_len_check check (char_length(sku) <= 100),
  add constraint items_name_len_check check (char_length(name) <= 200),
  add constraint items_barcode_len_check check (char_length(barcode) <= 100),
  add constraint items_unit_len_check check (char_length(unit) <= 20),
  add constraint items_memo_len_check check (char_length(memo) <= 2000);

alter table public.locations
  add constraint locations_code_len_check check (char_length(code) <= 50),
  add constraint locations_name_len_check check (char_length(name) <= 100);
