// 입출고 이력 달력 화면 (월 단위 일별 건수, 날짜를 누르면 오른쪽 패널에 그날 입출고 내역, 읽기 전용)
import Link from "next/link";
import { Suspense } from "react";
import { InlineAlert } from "@/components/lucian/inline-alert";
import { ListSkeleton } from "@/components/lucian/skeleton";
import {
  kstDay,
  monthGrid,
  monthKey,
  monthRangeIso,
  parseDay,
  parseMonth,
  shiftMonth,
  tallyByDay,
  type DayTally,
  type TallyRow,
} from "@/lib/calendar";
import { createClient } from "@/lib/supabase/server";
import { KINDS } from "./kinds";
import { RecentPanel } from "./recent-panel";

const PAGE = 1000;
const MAX_PAGES = 5;
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const MAX_CHIPS = 3;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const focus = "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";
const todayLink = `flex min-h-11 items-center rounded-xl border border-ink-3 bg-surface px-3 text-sm font-medium text-ink hover:bg-surface-2 ${focus}`;
const arrowLink = `flex h-full w-11 items-center justify-center text-ink hover:bg-surface-2 ${focus} focus-visible:ring-inset`;
const arrowSvg = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

async function CalendarContent({ year, month, today, selected }: { year: number; month: number; today: string; selected: string | null }) {
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
    <div>
      <nav aria-label="월 이동" className="flex flex-wrap items-center gap-x-2 gap-y-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold tabular-nums" aria-live="polite">
            {year}년 {month}월
          </p>
          <p className="text-sm text-ink-2">
            {month}월 1일 ~ {month}월 {new Date(Date.UTC(year, month, 0)).getUTCDate()}일
          </p>
        </div>
        <Link href="/calendar" className={todayLink}>
          오늘
        </Link>
        <div className="flex h-11 overflow-hidden rounded-xl border border-ink-3 bg-surface">
          <Link href={`/calendar?m=${monthKey(prev.year, prev.month)}`} aria-label="이전 달" className={arrowLink}>
            <svg {...arrowSvg}>
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </Link>
          <span aria-hidden="true" className="w-px bg-ink-3" />
          <Link href={`/calendar?m=${monthKey(next.year, next.month)}`} aria-label="다음 달" className={arrowLink}>
            <svg {...arrowSvg}>
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </nav>

      {failed && (
        <div className="px-4 pb-4">
          <InlineAlert>달력을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</InlineAlert>
        </div>
      )}
      {!failed && truncated && (
        <p className="px-4 pb-4 text-sm text-ink-2">이 달 이력이 많아 일부만 집계했습니다.</p>
      )}

      <div className="border-t border-line">
        <div className="grid h-10 grid-cols-7 border-b border-line text-sm text-ink-2">
          {WEEKDAYS.map((w, i) => (
            <div key={w} className={`flex items-center justify-center md:justify-start md:px-3 ${i > 0 ? "border-l border-line" : ""}`}>
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {monthGrid(year, month).map((day, i) => {
            const inMonth = day.startsWith(current);
            const isToday = day === today;
            const cell = `flex min-h-20 min-w-0 flex-col items-center gap-1 border-b border-line p-1 md:min-h-28 md:items-stretch md:p-1.5 ${i % 7 > 0 ? "border-l" : ""}`;
            const num = (
              <span
                className={`inline-flex h-6 min-w-6 items-center justify-center rounded-lg px-1 text-sm tabular-nums md:self-start ${
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
            const isSelected = day === selected;
            const label = `${month}월 ${Number(day.slice(8))}일 ${
              chips.length ? chips.map((k) => `${k.label} ${t![k.key]}건`).join(", ") : "이력 없음"
            }${isSelected ? ", 선택됨" : ""}`;
            return (
              <Link
                key={day}
                href={isSelected ? `/calendar?m=${current}` : `/calendar?m=${current}&d=${day}`}
                scroll={false}
                aria-label={label}
                aria-current={isToday ? "date" : undefined}
                className={`${cell} hover:bg-accent-soft ${isSelected ? "bg-accent-soft ring-2 ring-inset ring-accent" : ""} ${focus} focus-visible:relative focus-visible:ring-inset`}
              >
                {num}
                <span aria-hidden="true" className="flex gap-0.5 md:hidden">
                  {chips.slice(0, MAX_CHIPS).map((k) => (
                    <span key={k.key} className={`size-1.5 rounded-full ${k.dot}`} />
                  ))}
                </span>
                <span aria-hidden="true" className="hidden flex-col gap-1 md:flex">
                  {chips.slice(0, MAX_CHIPS).map((k) => (
                    <span key={k.key} className={`flex h-[22px] items-center truncate rounded-md px-1.5 text-xs font-semibold tabular-nums ${k.chip}`}>
                      {k.label} {t![k.key]}
                    </span>
                  ))}
                  {chips.length > MAX_CHIPS && <span className="px-1.5 text-xs text-ink-2">+{chips.length - MAX_CHIPS}개</span>}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// 월을 먼저 정한 뒤 달력과 입출고 내역 패널을 각자 Suspense 로 읽는다. 패널 오류·지연이 달력을 막지 않는다.
async function CalendarLayout({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.m) ? sp.m[0] : sp.m;
  const today = kstDay(new Date().toISOString());
  // m 이 없거나 실제 달이 아니면 이번 달(KST).
  const { year, month } = parseMonth(raw?.trim() ?? "") ?? parseMonth(today.slice(0, 7))!;
  // d 는 해당 월 안의 실제 날짜일 때만 쓴다.
  const rawDay = Array.isArray(sp.d) ? sp.d[0] : sp.d;
  const selected = parseDay(rawDay?.trim() ?? "", year, month);
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface xl:flex-row">
      <div className="min-w-0 flex-1">
        <Suspense fallback={<ListSkeleton />}>
          <CalendarContent year={year} month={month} today={today} selected={selected} />
        </Suspense>
      </div>
      <aside
        aria-label="입출고 내역"
        className="shrink-0 border-t border-line xl:w-[304px] xl:border-l xl:border-t-0"
      >
        <Suspense fallback={<ListSkeleton />}>
          <RecentPanel year={year} month={month} day={selected ?? undefined} />
        </Suspense>
      </aside>
    </div>
  );
}

export default function CalendarPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto max-w-5xl space-y-4 xl:max-w-7xl">
      <h1 className="text-xl font-bold">달력</h1>
      <Suspense fallback={<ListSkeleton />}>
        <CalendarLayout searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
