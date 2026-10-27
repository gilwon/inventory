// 달력 오른쪽 "입출고 내역" 패널 (그 달 최신 20건은 줄을 누르면 그날 이력으로, 날짜를 고르면 그날 전체(50건)를 정보 줄로 보인다)
import Link from "next/link";
import { EmptyState } from "@/components/lucian/empty-state";
import { InlineAlert } from "@/components/lucian/inline-alert";
import { kstDay, kstLabel, monthKey, monthRangeIso } from "@/lib/calendar";
import { formatQty } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { kindOf } from "./kinds";

const LIMIT = 20;
const DAY_LIMIT = 50;
const focus = "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset";

type Row = {
  id: number;
  type: string;
  delta: number;
  reverses_id: number | null;
  created_at: string;
  items: { sku: string; name: string; unit: string } | null;
};

export async function RecentPanel({ year, month, day }: { year: number; month: number; day?: string }) {
  // 날짜가 있으면 그날 KST 하루, 없으면 그 달 전체를 읽는다.
  const { from, to } = day
    ? { from: `${day}T00:00:00+09:00`, to: `${day}T23:59:59.999+09:00` }
    : monthRangeIso(year, month);
  const supabase = await createClient();
  // 이동은 transfer_out 한 줄만 보이도록 transfer_in 을 뺀다.
  const { data, error } = await supabase
    .from("movements")
    .select("id,type,delta,reverses_id,created_at,items(sku,name,unit)")
    .gte("created_at", from)
    .lte("created_at", to)
    .neq("type", "transfer_in")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(day ? DAY_LIMIT + 1 : LIMIT);
  const got: Row[] = error ? [] : (data ?? []);
  const more = Boolean(day) && got.length > DAY_LIMIT;
  const rows = more ? got.slice(0, DAY_LIMIT) : got;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const key = monthKey(year, month);

  return (
    <section>
      <header className="px-4 pb-3 pt-4">
        <h2 className="text-base font-bold">{day ? `${Number(day.slice(5, 7))}월 ${Number(day.slice(8))}일 ` : ""}입출고 내역</h2>
        <p className="text-sm text-ink-2">
          {year}년 {month}월
        </p>
      </header>

      {error && (
        <div className="px-4 pb-4">
          <InlineAlert>입출고 내역을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</InlineAlert>
        </div>
      )}
      {!error && rows.length === 0 && <EmptyState title={day ? "이 날 이력이 없습니다" : "이 달 이력이 없습니다"} />}

      {rows.length > 0 && (
        <ul className="border-t border-line">
          {rows.map((r) => {
            const kind = kindOf(r.type);
            const label = r.type === "adjust" && r.reverses_id ? "정정" : (kind?.label ?? r.type);
            const rowDay = kstDay(r.created_at);
            // 이동은 부호 없이, 나머지는 증감 부호를 따른다.
            const sign = r.type === "transfer_out" ? "" : r.delta > 0 ? "+" : r.delta < 0 ? "-" : "";
            const body = (
              <>
                <span className="flex items-center gap-2 text-xs text-ink-2">
                  <span className="tabular-nums">{day ? kstLabel(r.created_at).slice(-5) : kstLabel(r.created_at)}</span>
                  <span className={`inline-flex h-[22px] items-center rounded-md px-1.5 font-semibold ${kind?.chip ?? ""}`}>
                    {label}
                  </span>
                  <span className="ml-auto text-sm font-semibold tabular-nums text-ink">
                    {sign}
                    {formatQty(Math.abs(r.delta), r.items?.unit)}
                  </span>
                </span>
                <span className="break-words text-sm font-medium">
                  {r.items ? `${r.items.sku} ${r.items.name}` : "알 수 없는 품목"}
                </span>
              </>
            );
            const rowCls = "flex min-h-11 flex-col gap-1 px-4 py-2.5";
            return (
              <li key={r.id} className="border-b border-line">
                {day ? (
                  <div className={rowCls}>{body}</div>
                ) : (
                  <Link href={`/history?from=${rowDay}&to=${rowDay}`} className={`${rowCls} hover:bg-accent-soft ${focus}`}>
                    {body}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {more && <p className="px-4 py-3 text-sm text-ink-2">일부만 표시했습니다.</p>}
      <Link
        href={day ? `/history?from=${day}&to=${day}` : `/history?from=${key}-01&to=${key}-${String(last).padStart(2, "0")}`}
        className={`flex min-h-11 items-center px-4 text-sm font-medium text-accent hover:underline ${focus}`}
      >
        {day ? "이 날 이력 전체 보기" : "이 달 이력 전체 보기"}
      </Link>
    </section>
  );
}
