// 대시보드 화면 (품목 검색, 활성 품목·위치 수, 최근 이력 10건)
import Link from "next/link";
import { Suspense } from "react";
import { formatKst, formatQty } from "@/lib/format";
import { buildLocationPaths } from "@/lib/location-path";
import { createClient } from "@/lib/supabase/server";
import { btnSecondary, cardCls, errCls, inputCls, linkCls } from "./items/common";

type Row = {
  id: number;
  type: string;
  delta: number;
  reverses_id: number | null;
  created_at: string;
  location_id: string;
  items: { sku: string; name: string; unit: string } | null;
  profiles: { display_name: string | null } | null;
};

// 이력 화면(history/page.tsx)과 같은 유형 표기를 쓴다.
function typeLabel(r: Row): string {
  if (r.type === "adjust") return r.reverses_id ? "정정" : "조정";
  return (
    { receive: "입고", issue: "출고", transfer_out: "이동", transfer_in: "이동", import: "가져오기" }[
      r.type
    ] ?? r.type
  );
}

async function DashboardData() {
  const supabase = await createClient();
  const [itemCnt, locCnt, locRes, mvRes] = await Promise.all([
    supabase.from("items").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("locations").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("locations").select("id,parent_id,name"),
    supabase
      .from("movements")
      .select(
        "id,type,delta,reverses_id,created_at,location_id,items(sku,name,unit),profiles(display_name)",
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(10),
  ]);

  // DB 오류 문구는 화면에 노출하지 않는다.
  const failed = Boolean(itemCnt.error || locCnt.error || locRes.error || mvRes.error);
  const paths = buildLocationPaths(locRes.data ?? []);
  const rows: Row[] = mvRes.data ?? [];

  return (
    <>
      {failed && (
        <p role="alert" className={errCls}>
          일부 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      )}

      <section aria-label="요약" className="grid grid-cols-2 gap-3">
        <div className={cardCls}>
          <p className="text-sm text-ink-2">활성 품목</p>
          <p className="text-2xl font-bold tabular-nums">
            {itemCnt.error ? "-" : formatQty(itemCnt.count ?? 0)}
          </p>
        </div>
        <div className={cardCls}>
          <p className="text-sm text-ink-2">활성 위치</p>
          <p className="text-2xl font-bold tabular-nums">
            {locCnt.error ? "-" : formatQty(locCnt.count ?? 0)}
          </p>
        </div>
      </section>

      <section aria-labelledby="recent-h" className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 id="recent-h" className="text-lg font-bold">
            최근 이력
          </h2>
          <Link href="/history" className={`${linkCls} inline-flex min-h-11 items-center`}>
            이력 전체 보기
          </Link>
        </div>

        {!mvRes.error && rows.length === 0 && (
          <p className={`${cardCls} text-sm`}>아직 이력이 없습니다.</p>
        )}

        {rows.length > 0 && (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li
                key={r.id}
                className="grid gap-x-4 gap-y-1 rounded-2xl border border-line bg-surface p-3 text-sm md:grid-cols-[9rem_4rem_1fr_6rem_8rem] md:items-center"
              >
                <p className="text-ink-2">{formatKst(r.created_at)}</p>
                <p className="font-semibold">{typeLabel(r)}</p>
                <div className="min-w-0">
                  <p className="break-words font-medium">
                    {r.items ? `${r.items.sku} ${r.items.name}` : "알 수 없는 품목"}
                  </p>
                  <p className="break-words text-ink-2">
                    {paths.get(r.location_id) ?? ""}
                  </p>
                </div>
                <p className="font-semibold tabular-nums md:text-right">
                  {r.delta > 0 ? "+" : "-"}
                  {formatQty(Math.abs(r.delta), r.items?.unit)}
                </p>
                <p className="break-words text-ink-2">
                  작업자 {r.profiles?.display_name ?? "알 수 없음"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-bold">대시보드</h1>

      <form action="/items" method="get" role="search" className="space-y-2">
        <label htmlFor="dash-q" className="block text-sm font-medium">
          품목 검색 (SKU, 이름, 바코드)
        </label>
        <div className="flex gap-2">
          <input
            id="dash-q"
            name="q"
            type="search"
            maxLength={100}
            autoComplete="off"
            className={inputCls}
          />
          <button type="submit" className={btnSecondary}>
            검색
          </button>
        </div>
      </form>

      <Suspense fallback={<p className="text-sm text-ink-2">불러오는 중...</p>}>
        <DashboardData />
      </Suspense>
    </div>
  );
}
