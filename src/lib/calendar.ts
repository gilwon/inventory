// 입출고 달력의 날짜 계산과 일별 집계 순수 함수 (Date.UTC 기반이라 실행 환경 시간대와 무관)

const DAY_MS = 86_400_000;
const KST_MS = 9 * 3_600_000;

export type DayTally = { receive: number; issue: number; transfer: number; adjust: number; import: number };
export type TallyRow = { type: string; reverses_id: number | null; created_at: string };

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (t: number) => new Date(t).toISOString().slice(0, 10);

// "YYYY-MM" 이 실제 달이면 {year, month}, 아니면 null.
export function parseMonth(s: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  return month >= 1 && month <= 12 ? { year, month } : null;
}

// "YYYY-MM-DD" 가 실제 날짜이고 해당 월 안이면 그 문자열, 아니면 null.
export function parseDay(s: string, year: number, month: number): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const t = new Date(`${s}T00:00:00Z`).getTime();
  return !Number.isNaN(t) && ymd(t) === s && s.startsWith(`${monthKey(year, month)}-`) ? s : null;
}

export function monthKey(year: number, month: number): string {
  return `${String(year).padStart(4, "0")}-${pad(month)}`;
}

// 달을 delta 개월 옮긴다 (연도 넘김 포함).
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

// 일요일 시작 6주(42칸) 날짜 목록.
export function monthGrid(year: number, month: number): string[] {
  const first = Date.UTC(year, month - 1, 1);
  const start = first - new Date(first).getUTCDay() * DAY_MS;
  return Array.from({ length: 42 }, (_, i) => ymd(start + i * DAY_MS));
}

// UTC ISO 문자열을 KST 날짜 "YYYY-MM-DD" 로. 잘못된 값이면 빈 문자열.
export function kstDay(iso: string): string {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? "" : ymd(t + KST_MS);
}

// UTC ISO 문자열을 KST "10월 27일 14:30" 으로. 잘못된 값이면 빈 문자열.
export function kstLabel(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const k = new Date(t + KST_MS).toISOString();
  return `${Number(k.slice(5, 7))}월 ${Number(k.slice(8, 10))}일 ${k.slice(11, 16)}`;
}

// 해당 달의 KST 조회 범위 (1일 00:00:00.000 ~ 말일 23:59:59.999) 를 ISO 문자열로.
export function monthRangeIso(year: number, month: number): { from: string; to: string } {
  const start = Date.UTC(year, month - 1, 1) - KST_MS;
  const next = Date.UTC(year, month, 1) - KST_MS;
  return { from: new Date(start).toISOString(), to: new Date(next - 1).toISOString() };
}

// 일별 건수 집계. 이동은 transfer_out 만 세고(한 묶음 1건), 정정(reverses_id 있는 adjust)은 조정에 합친다.
export function tallyByDay(rows: TallyRow[]): Map<string, DayTally> {
  const map = new Map<string, DayTally>();
  for (const r of rows) {
    const key =
      r.type === "receive" ? "receive"
      : r.type === "issue" ? "issue"
      : r.type === "transfer_out" ? "transfer"
      : r.type === "adjust" ? "adjust"
      : r.type === "import" ? "import"
      : null;
    const day = kstDay(r.created_at);
    if (!key || !day) continue;
    const t = map.get(day) ?? { receive: 0, issue: 0, transfer: 0, adjust: 0, import: 0 };
    t[key]++;
    map.set(day, t);
  }
  return map;
}
