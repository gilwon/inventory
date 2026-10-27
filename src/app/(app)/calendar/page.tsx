// 입출고 이력 달력 화면 (월 단위 일별 건수, 날짜를 누르면 그날 이력 목록으로 이동, 읽기 전용)
import Link from "next/link";
import { Suspense } from "react";
import { InlineAlert } from "@/components/lucian/inline-alert";
import { ListSkeleton } from "@/components/lucian/skeleton";
import {
  kstDay,
  monthGrid,
  monthKey,
  monthRangeIso,
  parseMonth,
  shiftMonth,
  tallyByDay,
  type DayTally,
  type TallyRow,
} from "@/lib/calendar";
import { createClient } from "@/lib/supabase/server";

const PAGE = 1000;
const MAX_PAGES = 5;
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 칩 순서·글자·색. 색만으로 구분하지 않도록 글자를 함께 둔다.
const KINDS: { key: keyof DayTally; label: string; tone: string }[] = [
  { key: "receive", label: "입고", tone: "text-inbound" },
  { key: "issue", label: "출고", tone: "text-danger" },
  { key: "transfer", label: "이동", tone: "text-ink-2" },
  { key: "adjust", label: "조정", tone: "text-ink-2" },
  { key: "import", label: "가져오기", tone: "text-ink-2" },
];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const focus = "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";
const navLink = `flex min-h-11 items-center rounded-xl border border-ink-3 px-4 text-base font-medium text-ink hover:bg-surface-2 ${focus}`;

async function CalendarContent({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.m) ? sp.m[0] : sp.m;
  const today = kstDay(new Date().toISOString());
  // m 이 없거나 실제 달이 아니면 이번 달(KST).
  const { year, month } = parseMonth(raw?.trim() ?? "") ?? parseMonth(today.slice(0, 7))!;
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const current = monthKey(year, month);

  const { from, to } = monthRangeIso(year, month);
  const supabase = await createClient();
  const rows: TallyRow[] = [];
  let truncated = false;
  let failed = false;
  // 1000행씩 이어 읽고 5000행에서 멈춘다. 페이지 사이 중복·누락이 없게 정렬을 고정한다.
  for (let p = 0; p < MAX_PAGES; p++) {
    const { data, error } = await supabase
      .from("movements")
      .select("type,reverses_id,created_at")
      .gte("created_at", from)
      .lte("created_at", to)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(p * PAGE, (p + 1) * PAGE - 1);
    if (error) {
      failed = true;
      break;
    }
    rows.push(...data);
    if (data.length < PAGE) break;
    // 마지막 페이지까지 가득 찼으면 더 있을 수 있다.
    if (p === MAX_PAGES - 1) truncated = true;
  }
  const tally = failed ? new Map<string, DayTally>() : tallyByDay(rows);

  return (
    <div className="space-y-4">
      <nav aria-label="월 이동" className="flex flex-wrap items-center gap-2">
        <Link href={`/calendar?m=${monthKey(prev.year, prev.month)}`} className={navLink}>
          이전 달
        </Link>
        <p className="min-w-28 text-center text-lg font-bold tabular-nums" aria-live="polite">
          {year}년 {month}월
        </p>
        <Link href={`/calendar?m=${monthKey(next.year, next.month)}`} className={navLink}>
          다음 달
        </Link>
        <Link href="/calendar" className={navLink}>
          오늘
        </Link>
      </nav>

      {failed && <InlineAlert>달력을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</InlineAlert>}
      {!failed && truncated && (
        <p className="text-sm text-ink-2">이 달 이력이 많아 일부만 집계했습니다.</p>
      )}

      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="grid grid-cols-7 border-b border-line text-center text-sm font-medium text-ink-2">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-2">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {monthGrid(year, month).map((day, i) => {
            const inMonth = day.startsWith(current);
            const isToday = day === today;
            const cell = `min-h-20 min-w-0 border-line p-1 md:min-h-28 md:p-2 ${i % 7 > 0 ? "border-l" : ""} ${i >= 7 ? "border-t" : ""}`;
            const num = (
              <span
                className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-sm tabular-nums ${
                  isToday ? "bg-accent font-bold text-accent-ink" : "font-medium"
                }`}
              >
                {Number(day.slice(8))}
              </span>
            );
            // 이번 달 밖의 날짜는 건수를 세지 않으므로 흐리게만 보이고 링크를 걸지 않는다.
            if (!inMonth) {
              return (
                <div key={day} className={`${cell} bg-surface-2 text-ink-3`}>
                  {num}
                </div>
              );
            }
            const t = tally.get(day);
            const chips = KINDS.filter((k) => t && t[k.key] > 0);
            const label = `${month}월 ${Number(day.slice(8))}일 ${
              chips.length ? chips.map((k) => `${k.label} ${t![k.key]}건`).join(", ") : "이력 없음"
            }`;
            return (
              <Link
                key={day}
                href={`/history?from=${day}&to=${day}`}
                aria-label={label}
                aria-current={isToday ? "date" : undefined}
                className={`${cell} block hover:bg-surface-2 ${focus} focus-visible:relative`}
              >
                {num}
                <span aria-hidden="true" className="mt-1 flex flex-wrap gap-x-1.5 gap-y-0.5 md:flex-col md:gap-y-1">
                  {chips.map((k) => (
                    <span key={k.key} className={`flex items-center gap-1 text-xs font-semibold tabular-nums ${k.tone}`}>
                      <span className="size-1.5 rounded-full bg-current md:hidden" />
                      <span className="hidden md:inline">{k.label}</span>
                      {t![k.key]}
                    </span>
                  ))}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="text-xl font-bold">달력</h1>
      <Suspense fallback={<ListSkeleton />}>
        <CalendarContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
