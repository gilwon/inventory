-- 실사 일괄 조정(record_stocktake)과 부족 품목 조회(low_stock_items)

-- ---------------------------------------------------------------
-- 실사 (한 트랜잭션, 행마다 record_adjust 를 부른다. 실제로 수량이 바뀐 행 수를 반환한다)
-- p_rows 예시 [{"item_id":"uuid","actual_qty":3,"reason":"실사"}]
-- ---------------------------------------------------------------
create function public.record_stocktake(p_location_id uuid, p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_changed integer := 0;
  v_seen uuid[] := '{}';
  v_item uuid;
  v_id bigint;
  v_sku text;
  v_msg text;
  e jsonb;
  r record;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다' using errcode = '28000';
  end if;
  if p_location_id is null then
    raise exception '위치를 선택해야 합니다';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception '실사 데이터 형식이 올바르지 않습니다';
  end if;
  if jsonb_array_length(p_rows) = 0 then
    raise exception '실사할 품목이 없습니다';
  end if;
  if jsonb_array_length(p_rows) > 200 then
    raise exception '한 번에 200개 품목까지만 실사할 수 있습니다';
  end if;

  -- 입력 검증 (품목 id 형식과 중복, 수량 정수, 사유 문자열)
  for e in select x from jsonb_array_elements(p_rows) as x loop
    if jsonb_typeof(e) <> 'object'
       or jsonb_typeof(e -> 'item_id') is distinct from 'string'
       or jsonb_typeof(e -> 'actual_qty') is distinct from 'number'
       or jsonb_typeof(coalesce(e -> 'reason', 'null'::jsonb)) not in ('string', 'null') then
      raise exception '실사 데이터 형식이 올바르지 않습니다';
    end if;

    begin
      v_item := (e ->> 'item_id')::uuid;
    exception
      when invalid_text_representation then
        raise exception '실사 데이터 형식이 올바르지 않습니다';
    end;

    if (e ->> 'actual_qty')::numeric <> trunc((e ->> 'actual_qty')::numeric)
       or (e ->> 'actual_qty')::numeric < 0
       or (e ->> 'actual_qty')::numeric > 2147483647 then
      raise exception '실제 수량은 0 이상의 정수여야 합니다';
    end if;

    if v_item = any (v_seen) then
      raise exception '같은 품목이 중복되어 있습니다';
    end if;
    v_seen := v_seen || v_item;
  end loop;

  -- 품목 id 오름차순으로 처리해 동시 실사끼리 교착을 줄인다.
  for r in
    select (x ->> 'item_id')::uuid as item_id,
           (x ->> 'actual_qty')::numeric::integer as actual_qty,
           x ->> 'reason' as reason
      from jsonb_array_elements(p_rows) as x
     order by 1
  loop
    begin
      v_id := public.record_adjust(r.item_id, p_location_id, r.actual_qty, r.reason);
    exception
      when others then
        -- 어느 품목에서 실패했는지 알 수 있도록 SKU 를 붙여 다시 던진다. 전체가 롤백된다.
        get stacked diagnostics v_msg = message_text;
        select i.sku into v_sku from public.items i where i.id = r.item_id;
        raise exception '%: %', coalesce(v_sku, r.item_id::text), v_msg;
    end;

    -- record_adjust 는 수량이 같으면 0, 바뀌었으면 이력 id 를 반환한다.
    if v_id <> 0 then
      v_changed := v_changed + 1;
    end if;
  end loop;

  return v_changed;
end;
$$;

-- ---------------------------------------------------------------
-- 부족 품목 (활성, 최소 수량 0 초과, 합계가 최소 수량 미만. 부족한 양이 큰 순)
-- ---------------------------------------------------------------
create function public.low_stock_items()
returns table (
  item_id uuid,
  sku text,
  name text,
  unit text,
  total_qty bigint,
  min_qty integer,
  shortage bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select i.id,
         i.sku,
         i.name,
         i.unit,
         t.total_qty,
         i.min_qty,
         (i.min_qty - t.total_qty)::bigint
    from public.items i
   cross join lateral (
     select coalesce(sum(s.qty), 0)::bigint as total_qty
       from public.stock s
      where s.item_id = i.id
   ) t
   where i.active
     and i.min_qty > 0
     and t.total_qty < i.min_qty
   order by (i.min_qty - t.total_qty) desc, i.sku;
$$;

-- ---------------------------------------------------------------
-- 실행 권한 (anon 과 public 은 회수하고 로그인한 사용자에게만 준다)
-- ---------------------------------------------------------------
revoke all on function public.record_stocktake(uuid, jsonb) from public, anon;
revoke all on function public.low_stock_items() from public, anon;

grant execute on function public.record_stocktake(uuid, jsonb) to authenticated;
grant execute on function public.low_stock_items() to authenticated;
