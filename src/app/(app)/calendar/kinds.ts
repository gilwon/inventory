// 달력 칩과 입출고 내역 패널이 함께 쓰는 종류별 글자·색 매핑 (색은 calendar.css 의 .cal 변수)
import type { DayTally } from "@/lib/calendar";

// 칩 순서·글자·색. 색만으로 구분하지 않도록 글자를 함께 둔다.
export const KINDS: { key: keyof DayTally; label: string; chip: string; dot: string }[] = [
  { key: "receive", label: "입고", chip: "bg-(--cal-event-blue-bg) text-(--cal-event-blue-fg)", dot: "bg-(--cal-event-blue-fg)" },
  { key: "issue", label: "출고", chip: "bg-(--cal-event-pink-bg) text-(--cal-event-pink-fg)", dot: "bg-(--cal-event-pink-fg)" },
  { key: "transfer", label: "이동", chip: "bg-(--cal-event-cyan-bg) text-(--cal-event-cyan-fg)", dot: "bg-(--cal-event-cyan-fg)" },
  { key: "adjust", label: "조정", chip: "bg-(--cal-event-orange-bg) text-(--cal-event-orange-fg)", dot: "bg-(--cal-event-orange-fg)" },
  { key: "import", label: "가져오기", chip: "bg-(--cal-event-purple-bg) text-(--cal-event-purple-fg)", dot: "bg-(--cal-event-purple-fg)" },
];

// movements.type 을 칩 종류로 옮긴다. 모르는 type 은 null.
export function kindOf(type: string): (typeof KINDS)[number] | null {
  const key = type === "transfer_out" || type === "transfer_in" ? "transfer" : type;
  return KINDS.find((k) => k.key === key) ?? null;
}
