// 대시보드 화면 (벤토 그리드: 품목 검색, 활성 품목·위치 수, 부족 품목, 최근 이력 10건)
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/lucian/empty-state";
import { InlineAlert } from "@/components/lucian/inline-alert";
import { RollingNumber } from "@/components/lucian/rolling-number";
import { ListSkeleton } from "@/components/lucian/skeleton";
import { formatKst, formatQty } from "@/lib/format";
import { buildLocationPaths } from "@/lib/location-path";
import { moveTone } from "@/lib/move-tone";
import { createClient } from "@/lib/supabase/server";
import { btnSecondary, cardCls, focusRing, inputCls } from "./items/common";
import { LowStockCard } from "./low-stock-card";

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
    {
      receive: "입고",
      issue: "출고",
      transfer_out: "이동",
      transfer_in: "이동",
      import: "가져오기",
    }[r.type] ?? r.type
  );
}

// 자주 쓰는 화면으로 바로 이동하는 링크(하단 탭에 없는 실사·라벨 포함).
const QUICK_LINKS = [
  { href: "/move", label: "입출고 기록" },
  { href: "/scan", label: "스캔" },
  { href: "/stocktake", label: "실사" },
  { href: "/labels", label: "라벨 출력" },
];

async function DashboardData() {
  const supabase = await createClient();
  const [itemCnt, locCnt, locRes, mvRes] = await Promise.all([
    supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
    supabase
      .from("locations")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
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
  const failed = Boolean(
    itemCnt.error || locCnt.error || locRes.error || mvRes.error,
  );
  const paths = buildLocationPaths(locRes.data ?? []);
  const rows: Row[] = mvRes.data ?? [];

  return (
    <>
      {failed && (
        <div className="col-span-full">
          <InlineAlert>
            일부 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </InlineAlert>
        </div>
      )}

      <div className={cardCls}>
        <p className="text-sm text-ink-2">활성 품목</p>
        {itemCnt.error ? (
          <p className="text-2xl font-bold tabular-nums">-</p>
        ) : (
          <RollingNumber
            value={formatQty(itemCnt.count ?? 0)}
            label="활성 품목"
          />
        )}
      </div>
      <div className={cardCls}>
        <p className="text-sm text-ink-2">활성 위치</p>
        {locCnt.error ? (
          <p className="text-2xl font-bold tabular-nums">-</p>
        ) : (
          <RollingNumber
            value={formatQty(locCnt.count ?? 0)}
            label="활성 위치"
          />
        )}
      </div>

      {/* 칸 너비에 맞춰 표/카드가 바뀌도록 컨테이너 쿼리를 쓴다. */}
      <div className="@container col-span-2 md:col-span-4 lg:col-span-2 [&>section]:h-full">
        <LowStockCard />
      </div>

      <section
        aria-labelledby="recent-h"
        className={`${cardCls} col-span-2 space-y-3 md:col-span-4 lg:col-span-2 lg:row-span-2`}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="recent-h" className="text-base font-bold">
            최근 이력
          </h2>
          <Link href="/history" className={btnSecondary}>
            이력 전체 보기
          </Link>
        </div>

        {!mvRes.error && rows.length === 0 && (
          <EmptyState
            title="아직 이력이 없습니다"
            description="입출고를 기록하면 여기에 보입니다."
          />
        )}

        {rows.length > 0 && (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id} className="space-y-0.5 py-2 text-sm">
                <div className="flex justify-between gap-3">
                  <p className="min-w-0 break-words font-medium">
                    <span className={`mr-2 font-semibold ${moveTone(r.type)}`}>
                      {typeLabel(r)}
                    </span>
                    {r.items
                      ? `${r.items.sku} ${r.items.name}`
                      : "알 수 없는 품목"}
                  </p>
                  <p
                    className={`shrink-0 font-semibold tabular-nums ${moveTone(r.type)}`}
                  >
                    {r.delta > 0 ? "+" : "-"}
                    {formatQty(Math.abs(r.delta), r.items?.unit)}
                  </p>
                </div>
                <p className="break-words text-ink-2">
                  {formatKst(r.created_at)} · {paths.get(r.location_id) ?? ""} ·
                  작업자 {r.profiles?.display_name ?? "알 수 없음"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="quick-h"
        className={`${cardCls} col-span-2 space-y-3 md:col-span-4 lg:col-span-2`}
      >
        <h2 id="quick-h" className="text-base font-bold">
          바로가기
        </h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-2">
          {QUICK_LINKS.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className={`flex min-h-14 items-center rounded-xl bg-surface-2 px-3 text-sm font-medium text-ink hover:bg-surface-3 ${focusRing}`}
            >
              {q.label}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="text-xl font-bold">대시보드</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <form
          action="/items"
          method="get"
          role="search"
          className={`${cardCls} col-span-2 space-y-2`}
        >
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

        <Suspense
          fallback={
            <div className="col-span-full">
              <ListSkeleton />
            </div>
          }
        >
          <DashboardData />
        </Suspense>
      </div>
    </div>
  );
}
