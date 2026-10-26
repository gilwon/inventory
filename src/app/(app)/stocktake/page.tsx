// 일괄 실사 화면 (위치 선택은 쿼리스트링, 품목 목록은 서버에서 조회)
import { Suspense } from "react";
import { buildLocationPaths } from "@/lib/location-path";
import { createClient } from "@/lib/supabase/server";
import { btnSecondary, cardCls, errCls, inputCls, isUuid } from "../items/common";
import { StocktakeForm } from "./stocktake-form";

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

async function StocktakeContent({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const locParam = first(sp.location);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("locations")
    .select("id,parent_id,name,active");
  if (error) {
    return (
      <p role="alert" className={errCls}>
        위치 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
      </p>
    );
  }
  const all = data ?? [];
  const paths = buildLocationPaths(all);
  const locations = all
    .filter((l) => l.active)
    .map((l) => ({ id: l.id, path: paths.get(l.id) ?? l.name }))
    .sort((a, b) => a.path.localeCompare(b.path, "ko"));
  // 활성 위치가 아니면 선택하지 않은 것으로 본다. 하위 위치는 합산하지 않는다.
  const selected = isUuid(locParam) ? locations.find((l) => l.id === locParam) : undefined;

  let body: React.ReactNode = null;
  if (selected) {
    const { data: stock, error: stockErr } = await supabase
      .from("stock")
      .select("qty, items!inner(id,sku,name,unit,active)")
      .eq("location_id", selected.id)
      .gt("qty", 0)
      .eq("items.active", true);
    if (stockErr) {
      body = (
        <p role="alert" className={errCls}>
          품목 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      );
    } else {
      const items = (stock ?? [])
        .map((s) => ({
          id: s.items.id,
          sku: s.items.sku,
          name: s.items.name,
          unit: s.items.unit,
          qty: s.qty,
        }))
        .sort((a, b) => a.sku.localeCompare(b.sku, "ko"));
      body = <StocktakeForm key={selected.id} locationId={selected.id} items={items} />;
    }
  }

  return (
    <>
      <form method="get" className={`${cardCls} space-y-2`}>
        <label htmlFor="location" className="block text-sm font-medium">
          실사할 위치
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            id="location"
            name="location"
            defaultValue={selected?.id ?? ""}
            className={inputCls}
          >
            <option value="">위치를 선택하세요</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.path}
              </option>
            ))}
          </select>
          <button type="submit" className={btnSecondary}>
            품목 불러오기
          </button>
        </div>
      </form>
      {body}
    </>
  );
}

export default function StocktakePage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-bold">실사</h1>
      <Suspense fallback={<p className="text-sm text-ink-2">불러오는 중입니다.</p>}>
        <StocktakeContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
