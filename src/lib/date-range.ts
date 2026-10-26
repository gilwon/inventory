// 기간 선택 달력용 날짜 순수 함수. 날짜는 YYYY-MM-DD 문자열로만 다뤄 타임존 때문에 하루가 밀리지 않게 한다.

// 월은 0부터 시작한다(JS Date와 같은 규칙).
const pad = (n: number, w = 2) => String(n).padStart(w, "0");

export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export function toKey(y: number, m: number, d: number): string {
  return `${pad(y, 4)}-${pad(m + 1)}-${pad(d)}`;
}

// 형식과 실제 달력을 모두 확인한다. 잘못된 문자열이면 null.
export function parseKey(s: string): { y: number; m: number; d: number } | null {
  const hit = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!hit) return null;
  const y = Number(hit[1]);
  const m = Number(hit[2]) - 1;
  const d = Number(hit[3]);
  return toKey(y, m, d) === utcKey(Date.UTC(y, m, d)) ? { y, m, d } : null;
}

// UTC 필드로만 읽고 쓰므로 실행 환경의 타임존과 무관하다.
function utcKey(ms: number): string {
  const t = new Date(ms);
  return toKey(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

export function weekdayOfMonthStart(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 1)).getUTCDay();
}

export function weekdayOf(key: string): number {
  const p = parseKey(key);
  return p ? new Date(Date.UTC(p.y, p.m, p.d)).getUTCDay() : 0;
}

export function addDays(key: string, n: number): string {
  const p = parseKey(key);
  if (!p) return key;
  return utcKey(Date.UTC(p.y, p.m, p.d + n));
}

export function shiftMonth(y: number, m: number, delta: number): { y: number; m: number } {
  const t = new Date(Date.UTC(y, m + delta, 1));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() };
}

// 일요일 시작 6주(42칸). 달 밖의 칸은 null.
export function monthCells(y: number, m: number): (string | null)[] {
  const first = weekdayOfMonthStart(y, m);
  const n = daysInMonth(y, m);
  return Array.from({ length: 42 }, (_, i) => {
    const d = i - first + 1;
    return d >= 1 && d <= n ? toKey(y, m, d) : null;
  });
}

// 양 끝 날짜를 포함한 일수. 순서가 뒤집혀 있어도 같은 값이다.
export function spanDays(a: string, b: string): number {
  const pa = parseKey(a);
  const pb = parseKey(b);
  if (!pa || !pb) return 0;
  const diff = Math.abs(Date.UTC(pa.y, pa.m, pa.d) - Date.UTC(pb.y, pb.m, pb.d));
  return Math.round(diff / 86400000) + 1;
}

export function summarize(from: string, to: string): string {
  if (!from && !to) return "기간을 고르지 않았습니다";
  if (from && !to) return `${from}부터`;
  const [a, b] = from <= to ? [from, to] : [to, from];
  return `${a} ~ ${b}, ${spanDays(a, b)}일`;
}

// 사용자 로컬 타임존 기준 오늘.
export function todayKey(now: Date = new Date()): string {
  return toKey(now.getFullYear(), now.getMonth(), now.getDate());
}
