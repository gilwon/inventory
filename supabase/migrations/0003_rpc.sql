-- 수량 변경, 정정, 가져오기, 검색, 검증 함수 (RPC)

-- ---------------------------------------------------------------
-- 내부 도우미 (외부 호출 불가, 아래 함수들이 owner 권한으로 부른다)
-- ---------------------------------------------------------------

-- 품목과 위치가 존재하고 활성인지 확인하며 행을 공유 잠금한다.
-- 공유 잠금은 같은 트랜잭션이 끝나기 전에 다른 쪽이 보관 처리하는 것을 막는다.
create function public._check_active(p_item_id uuid, p_location_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_active boolean;
begin
  select i.active into v_active from public.items i where i.id = p_item_id for share;
  if not found then
    raise exception '품목을 찾을 수 없습니다';
  end if;
  if not v_active then
    raise exception '보관된 품목입니다';
  end if;

  select l.active into v_active from public.locations l where l.id = p_location_id for share;
  if not found then
    raise exception '위치를 찾을 수 없습니다';
  end if;
  if not v_active then
    raise exception '보관된 위치입니다';
  end if;
end;
$$;

-- 품목x위치 수량을 증감한다. 같은 행의 동시 변경은 행 잠금으로 직렬화되고,
-- 음수가 되는 경우는 stock.qty >= 0 체크 제약이 최종으로 막는다.
create function public._apply_stock(p_item_id uuid, p_location_id uuid, p_delta integer)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_delta > 0 then
    insert into public.stock as s (item_id, location_id, qty)
    values (p_item_id, p_location_id, p_delta)
    on conflict (item_id, location_id) do update set qty = s.qty + excluded.qty;
  else
    -- 음수 값은 insert 후보 행 단계에서 체크 제약에 걸리므로 update 로 처리한다.
    update public.stock
       set qty = qty + p_delta
     where item_id = p_item_id and location_id = p_location_id;
    if not found then
      raise exception '재고가 부족합니다';
    end if;
  end if;
exception
  when check_violation then
    raise exception '재고가 부족합니다';
  when numeric_value_out_of_range then
    raise exception '수량이 허용 범위를 넘습니다';
end;
$$;

-- ---------------------------------------------------------------
-- 입고
-- ---------------------------------------------------------------
create function public.record_receive(
  p_item_id uuid,
  p_location_id uuid,
  p_qty integer,
  p_reason text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다' using errcode = '28000';
  end if;
  if p_qty is null or p_qty <= 0 then
    raise exception '수량은 1 이상의 정수여야 합니다';
  end if;

  perform public._check_active(p_item_id, p_location_id);
  perform public._apply_stock(p_item_id, p_location_id, p_qty);

  insert into public.movements (item_id, location_id, type, delta, reason, created_by)
  values (p_item_id, p_location_id, 'receive', p_qty, nullif(btrim(p_reason), ''), auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------
-- 출고
-- ---------------------------------------------------------------
create function public.record_issue(
  p_item_id uuid,
  p_location_id uuid,
  p_qty integer,
  p_reason text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다' using errcode = '28000';
  end if;
  if p_qty is null or p_qty <= 0 then
    raise exception '수량은 1 이상의 정수여야 합니다';
  end if;

  perform public._check_active(p_item_id, p_location_id);
  perform public._apply_stock(p_item_id, p_location_id, -p_qty);

  insert into public.movements (item_id, location_id, type, delta, reason, created_by)
  values (p_item_id, p_location_id, 'issue', -p_qty, nullif(btrim(p_reason), ''), auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------
-- 이동 (같은 group_id 로 두 행)
-- ---------------------------------------------------------------
create function public.record_transfer(
  p_item_id uuid,
  p_from_location_id uuid,
  p_to_location_id uuid,
  p_qty integer,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group uuid := gen_random_uuid();
  v_reason text := nullif(btrim(p_reason), '');
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다' using errcode = '28000';
  end if;
  if p_qty is null or p_qty <= 0 then
    raise exception '수량은 1 이상의 정수여야 합니다';
  end if;
  if p_from_location_id is not distinct from p_to_location_id then
    raise exception '출발 위치와 도착 위치가 같습니다';
  end if;

  perform public._check_active(p_item_id, p_from_location_id);
  perform public._check_active(p_item_id, p_to_location_id);

  perform public._apply_stock(p_item_id, p_from_location_id, -p_qty);
  perform public._apply_stock(p_item_id, p_to_location_id, p_qty);

  insert into public.movements (item_id, location_id, type, delta, reason, group_id, created_by)
  values
    (p_item_id, p_from_location_id, 'transfer_out', -p_qty, v_reason, v_group, auth.uid()),
    (p_item_id, p_to_location_id, 'transfer_in', p_qty, v_reason, v_group, auth.uid());

  return v_group;
end;
$$;

-- ---------------------------------------------------------------
-- 조정 (실제 수량을 입력하면 차이를 기록한다. 차이가 0이면 0을 반환한다)
-- ---------------------------------------------------------------
create function public.record_adjust(
  p_item_id uuid,
  p_location_id uuid,
  p_actual_qty integer,
  p_reason text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cur integer;
  v_diff integer;
  v_id bigint;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다' using errcode = '28000';
  end if;
  if p_actual_qty is null or p_actual_qty < 0 then
    raise exception '실제 수량은 0 이상의 정수여야 합니다';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception '조정 사유를 입력해야 합니다';
  end if;

  perform public._check_active(p_item_id, p_location_id);

  -- 현재 수량을 읽고 차이를 계산하는 동안 다른 입력이 끼어들지 못하도록 행을 먼저 만들고 잠근다.
  insert into public.stock (item_id, location_id, qty)
  values (p_item_id, p_location_id, 0)
  on conflict (item_id, location_id) do nothing;

  select s.qty into v_cur
    from public.stock s
   where s.item_id = p_item_id and s.location_id = p_location_id
     for update;

  v_diff := p_actual_qty - v_cur;
  if v_diff = 0 then
    return 0;
  end if;

  perform public._apply_stock(p_item_id, p_location_id, v_diff);

  insert into public.movements (item_id, location_id, type, delta, reason, created_by)
  values (p_item_id, p_location_id, 'adjust', v_diff, btrim(p_reason), auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------
-- 정정 (반대 방향 이력을 추가한다. 새로 만든 이력 id 배열을 반환한다)
-- ---------------------------------------------------------------
create function public.reverse_movement(p_movement_id bigint)
returns bigint[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_m public.movements%rowtype;
  v_ids bigint[];
  v_group uuid;
  v_new bigint;
  v_out bigint[] := '{}';
  r record;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다' using errcode = '28000';
  end if;

  select * into v_m from public.movements m where m.id = p_movement_id;
  if not found then
    raise exception '이력을 찾을 수 없습니다';
  end if;
  if v_m.reverses_id is not null then
    raise exception '정정 이력은 다시 정정할 수 없습니다';
  end if;

  -- 이동은 같은 묶음의 두 행을 함께 정정한다.
  if v_m.type in ('transfer_out', 'transfer_in') and v_m.group_id is not null then
    select array_agg(m.id order by m.id) into v_ids
      from public.movements m
     where m.group_id = v_m.group_id and m.reverses_id is null;
  else
    v_ids := array[v_m.id];
  end if;

  if exists (select 1 from public.movements m where m.reverses_id = any (v_ids)) then
    raise exception '이미 정정된 이력입니다';
  end if;

  if array_length(v_ids, 1) > 1 then
    v_group := gen_random_uuid();
  end if;

  begin
    for r in
      select m.id, m.item_id, m.location_id, m.delta
        from public.movements m
       where m.id = any (v_ids)
       order by m.id
    loop
      perform public._check_active(r.item_id, r.location_id);
      perform public._apply_stock(r.item_id, r.location_id, -r.delta);

      -- 정정 행은 조정 유형으로 기록하고 reverses_id 로 원본을 가리킨다.
      insert into public.movements (item_id, location_id, type, delta, reason, group_id, reverses_id, created_by)
      values (r.item_id, r.location_id, 'adjust', -r.delta, '정정 (원본 #' || r.id || ')', v_group, r.id, auth.uid())
      returning id into v_new;

      v_out := v_out || v_new;
    end loop;
  exception
    -- 동시에 같은 원본을 정정하면 reverses_id 유일 제약이 막는다.
    when unique_violation then
      raise exception '이미 정정된 이력입니다';
  end;

  return v_out;
end;
$$;

-- ---------------------------------------------------------------
-- 엑셀 가져오기 (한 트랜잭션, 생성/갱신/무시 건수를 반환한다)
-- payload 예시 {locations:[{code,name,parent_code}], items:[{sku,name,barcode,unit,min_qty,memo}], stocks:[{sku,location_code,qty}]}
-- ---------------------------------------------------------------
create function public.import_apply(p_payload jsonb)
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
-- 품목 검색 (SKU, 바코드 정확 일치 우선, 그다음 부분 일치)
-- ---------------------------------------------------------------
create function public.search_items(
  q text default '',
  lim integer default 50,
  off integer default 0,
  include_archived boolean default false
)
returns table (
  id uuid,
  sku text,
  name text,
  barcode text,
  unit text,
  min_qty integer,
  memo text,
  photo_path text,
  active boolean,
  created_at timestamptz,
  total_qty bigint
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_q text := btrim(coalesce(q, ''));
  v_lim integer := least(greatest(coalesce(lim, 50), 1), 200);
  v_off integer := greatest(coalesce(off, 0), 0);
  v_pat text;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다' using errcode = '28000';
  end if;

  if v_q = '' then
    return query
      select i.id, i.sku, i.name, i.barcode, i.unit, i.min_qty, i.memo, i.photo_path, i.active, i.created_at,
             (select coalesce(sum(s.qty), 0)::bigint from public.stock s where s.item_id = i.id)
        from public.items i
       where include_archived or i.active
       order by lower(i.name), i.id
       limit v_lim offset v_off;
    return;
  end if;

  -- like 패턴 문자 백슬래시, %, _ 를 이스케이프한다.
  v_pat := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';

  return query
    select i.id, i.sku, i.name, i.barcode, i.unit, i.min_qty, i.memo, i.photo_path, i.active, i.created_at,
           (select coalesce(sum(s.qty), 0)::bigint from public.stock s where s.item_id = i.id)
      from public.items i
     where (include_archived or i.active)
       and (   lower(i.sku) = lower(v_q)
            or lower(i.barcode) = lower(v_q)
            or i.sku ilike v_pat
            or i.name ilike v_pat
            or i.barcode ilike v_pat)
     order by (case when lower(i.sku) = lower(v_q) or lower(i.barcode) = lower(v_q) then 0 else 1 end),
              lower(i.name), i.id
     limit v_lim offset v_off;
end;
$$;

-- ---------------------------------------------------------------
-- 수량과 이력 합계가 다른 조합을 반환한다 (읽기 전용, 결과가 비어야 정상)
-- ---------------------------------------------------------------
create function public.verify_stock_ledger()
returns table (item_id uuid, location_id uuid, stock_qty bigint, ledger_qty bigint)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다' using errcode = '28000';
  end if;

  return query
    select coalesce(s.item_id, l.item_id),
           coalesce(s.location_id, l.location_id),
           coalesce(s.qty, 0)::bigint,
           coalesce(l.total, 0)::bigint
      from public.stock s
      full join (
        select m.item_id, m.location_id, sum(m.delta) as total
          from public.movements m
         group by m.item_id, m.location_id
      ) l on l.item_id = s.item_id and l.location_id = s.location_id
     where coalesce(s.qty, 0) <> coalesce(l.total, 0);
end;
$$;

-- ---------------------------------------------------------------
-- 실행 권한 (Supabase 기본 권한이 anon 에도 실행을 주므로 명시적으로 회수한다)
-- ---------------------------------------------------------------
revoke all on function public._check_active(uuid, uuid) from public, anon, authenticated;
revoke all on function public._apply_stock(uuid, uuid, integer) from public, anon, authenticated;

revoke all on function public.record_receive(uuid, uuid, integer, text) from public, anon, authenticated;
revoke all on function public.record_issue(uuid, uuid, integer, text) from public, anon, authenticated;
revoke all on function public.record_transfer(uuid, uuid, uuid, integer, text) from public, anon, authenticated;
revoke all on function public.record_adjust(uuid, uuid, integer, text) from public, anon, authenticated;
revoke all on function public.reverse_movement(bigint) from public, anon, authenticated;
revoke all on function public.import_apply(jsonb) from public, anon, authenticated;
revoke all on function public.search_items(text, integer, integer, boolean) from public, anon, authenticated;
revoke all on function public.verify_stock_ledger() from public, anon, authenticated;

grant execute on function public.record_receive(uuid, uuid, integer, text) to authenticated;
grant execute on function public.record_issue(uuid, uuid, integer, text) to authenticated;
grant execute on function public.record_transfer(uuid, uuid, uuid, integer, text) to authenticated;
grant execute on function public.record_adjust(uuid, uuid, integer, text) to authenticated;
grant execute on function public.reverse_movement(bigint) to authenticated;
grant execute on function public.import_apply(jsonb) to authenticated;
grant execute on function public.search_items(text, integer, integer, boolean) to authenticated;
grant execute on function public.verify_stock_ledger() to authenticated;
