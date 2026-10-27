// 달력 칩과 입출고 내역 패널이 함께 쓰는 종류별 글자·색 매핑 (색은 앱 토큰만 쓴다)
import type { DayTally } from "@/lib/calendar";

// 칩 순서·글자·색. 입고 text-inbound, 출고 text-danger, 나머지는 중립. 색만으로 구분하지 않도록 글자를 함께 둔다.
export const KINDS: { key: keyof DayTally; label: string; chip: string; dot: string }[] = [
  { key: "receive", label: "입고", chip: "bg-inbound/10 text-inbound", dot: "bg-inbound" },
  { key: "issue", label: "출고", chip: "bg-danger/10 text-danger", dot: "bg-danger" },
  { key: "transfer", label: "이동", chip: "bg-surface-3 text-ink-2", dot: "bg-ink-3" },
  { key: "adjust", label: "조정", chip: "bg-surface-3 text-ink-2", dot: "bg-ink-3" },
  { key: "import", label: "가져오기", chip: "bg-surface-3 text-ink-2", dot: "bg-ink-3" },
];

// movements.type 을 칩 종류로 옮긴다. 모르는 type 은 null.
export function kindOf(type: string): (typeof KINDS)[number] | null {
  const key = type === "transfer_out" || type === "transfer_in" ? "transfer" : type;
  return KINDS.find((k) => k.key === key) ?? null;
}
