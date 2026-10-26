// 입출고 폼의 제출 전 검증 오류 목록과 확인 요약·버튼 문구를 만드는 순수 함수
import { formatQty } from "./format";

export type MoveTab = "receive" | "issue" | "transfer" | "adjust";
// 화면 위에서 아래 순서. 첫 오류 칸 포커스 판단에 쓴다.
export type MoveField = "item" | "loc" | "toLoc" | "qty" | "reason";
export type MoveErrors = Partial<Record<MoveField, string>>;
export const MOVE_FIELD_ORDER: MoveField[] = ["item", "loc", "toLoc", "qty", "reason"];

const LABEL: Record<MoveTab, string> = {
  receive: "입고",
  issue: "출고",
  transfer: "이동",
  adjust: "조정",
};

// 재고보다 많이 빼는 출고·이동인지 판단한다. 현재 수량을 모르면 막지 않는다.
export function isOverStock(
  tab: MoveTab,
  qtyNum: number | null,
  current: number | null | undefined,
): boolean {
  return (
    (tab === "issue" || tab === "transfer") &&
    qtyNum !== null &&
    typeof current === "number" &&
    qtyNum > current
  );
}

export function qtyOverMessage(current: number, unit: string): string {
  return `현재 수량(${formatQty(current, unit)})보다 많아 제출할 수 없습니다.`;
}

type CheckInput = {
  tab: MoveTab;
  hasItem: boolean;
  locId: string;
  toLocId: string;
  qtyNum: number | null;
  current: number | null | undefined;
  unit: string;
  reason: string;
};

// 제출 시 클라이언트 검증. 칸마다 오류 문구 하나를 돌려주고 오류가 없으면 빈 객체.
export function validateMove(c: CheckInput): MoveErrors {
  const e: MoveErrors = {};
  if (!c.hasItem) e.item = "품목을 선택해 주세요.";
  if (!c.locId) e.loc = c.tab === "transfer" ? "출발 위치를 선택해 주세요." : "위치를 선택해 주세요.";
  if (c.tab === "transfer") {
    if (!c.toLocId) e.toLoc = "도착 위치를 선택해 주세요.";
    else if (c.toLocId === c.locId) e.toLoc = "출발 위치와 도착 위치가 같습니다.";
  }
  if (c.qtyNum === null || (c.tab !== "adjust" && c.qtyNum < 1)) {
    e.qty =
      c.tab === "adjust"
        ? "수량은 0 이상의 정수로 입력해 주세요."
        : "수량은 1 이상의 정수로 입력해 주세요.";
  } else if (isOverStock(c.tab, c.qtyNum, c.current)) {
    e.qty = qtyOverMessage(c.current as number, c.unit);
  }
  if (c.tab === "adjust" && !c.reason.trim()) e.reason = "조정 사유를 입력해 주세요.";
  return e;
}

type SummaryInput = {
  tab: MoveTab;
  itemLabel: string | null;
  locPath: string;
  toPath: string;
  qtyNum: number | null;
  current: number | null | undefined;
  unit: string;
};

// 제출 버튼 위에 보일 한 줄 요약. 값이 덜 채워졌으면 다음에 할 일을 안내한다.
export function moveSummary(s: SummaryInput): string {
  if (!s.itemLabel || !s.locPath) return "품목과 위치를 선택하세요";
  if (s.tab === "transfer" && !s.toPath) {
    return `${s.itemLabel} · ${s.locPath} → 도착 위치를 선택하세요`;
  }
  const where = s.tab === "transfer" ? `${s.locPath} → ${s.toPath}` : s.locPath;
  const head = `${s.itemLabel} · ${where}`;
  if (s.qtyNum === null) return `${head} · 수량을 입력하세요`;
  if (s.tab === "adjust") {
    if (typeof s.current !== "number") return `${head} · 실제 ${formatQty(s.qtyNum, s.unit)}`;
    const diff = s.qtyNum - s.current;
    return `${head} · 현재 ${formatQty(s.current, s.unit)} → 실제 ${formatQty(s.qtyNum, s.unit)} (차이 ${diff > 0 ? "+" : ""}${formatQty(diff)})`;
  }
  return `${head} · ${formatQty(s.qtyNum, s.unit)} ${LABEL[s.tab]}`;
}

// 수량이 있으면 "3 개 출고 기록"처럼 작업 내용을 버튼 글자에 담는다.
export function moveButtonLabel(tab: MoveTab, qtyNum: number | null, unit: string): string {
  if (qtyNum === null) return `${LABEL[tab]} 기록`;
  const q = formatQty(qtyNum, unit);
  return tab === "adjust" ? `실제 ${q} 조정 기록` : `${q} ${LABEL[tab]} 기록`;
}
