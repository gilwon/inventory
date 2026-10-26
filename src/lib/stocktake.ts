// 실사 입력에서 장부와 다른 행만 추려 내고 검증하는 순수 함수
import { isUuid } from "../app/(app)/items/common";

export const MAX_ROWS = 200;
// DB 정수 열(int)의 최댓값
export const MAX_QTY = 2147483647;

export type StocktakeRow = { item_id: string; actual_qty: number; reason: string };
export type BookItem = { id: string; qty: number };
export type EntryInput = { actual: string; reason: string };

// 0 이상의 정수 문자열만 받는다. 소수·음수·공백·지수 표기는 null.
export function parseQty(text: string): number | null {
  const t = text.trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return n <= MAX_QTY ? n : null;
}

export type CollectResult = {
  rows: StocktakeRow[];
  // 장부와 다른 값을 정상 입력한 행 수 (사유 누락 포함)
  changed: number;
  // 품목 id별 행 오류 (수량 형식, 사유 누락)
  errors: Record<string, { qty?: string; reason?: string }>;
  // 제출을 막는 전체 오류 (200행 초과 등)
  error: string | null;
};

// 비어 있거나 장부와 같은 행은 건드리지 않고, 다른 행만 사유와 함께 rows 에 담는다.
export function collectChangedRows(
  items: BookItem[],
  inputs: Record<string, EntryInput | undefined>,
): CollectResult {
  const rows: StocktakeRow[] = [];
  const errors: CollectResult["errors"] = {};
  let changed = 0;
  for (const it of items) {
    const input = inputs[it.id];
    if (!input || input.actual.trim() === "") continue;
    const qty = parseQty(input.actual);
    if (qty === null) {
      errors[it.id] = { qty: "수량은 0 이상의 정수로 입력해 주세요." };
      continue;
    }
    if (qty === it.qty) continue;
    changed++;
    const reason = input.reason.trim();
    if (!reason) {
      errors[it.id] = { reason: "사유를 입력해 주세요." };
      continue;
    }
    rows.push({ item_id: it.id, actual_qty: qty, reason });
  }
  const error =
    changed > MAX_ROWS
      ? `한 번에 ${MAX_ROWS}건까지만 조정할 수 있습니다.`
      : null;
  return { rows, changed, errors, error };
}

// Server Action 입력 검증. 클라이언트가 보낸 값을 믿지 않고 같은 규칙을 다시 적용한다.
export function validateRows(
  raw: unknown,
): { ok: true; rows: StocktakeRow[] } | { ok: false; error: string } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: "조정할 품목이 없습니다." };
  }
  if (raw.length > MAX_ROWS) {
    return { ok: false, error: `한 번에 ${MAX_ROWS}건까지만 조정할 수 있습니다.` };
  }
  const seen = new Set<string>();
  const rows: StocktakeRow[] = [];
  for (const r of raw) {
    const o = (r ?? {}) as Record<string, unknown>;
    const itemId = String(o.item_id ?? "");
    if (!isUuid(itemId)) return { ok: false, error: "품목 정보가 올바르지 않습니다." };
    if (seen.has(itemId)) return { ok: false, error: "같은 품목이 중복되어 있습니다." };
    seen.add(itemId);
    const qty = typeof o.actual_qty === "number" ? o.actual_qty : NaN;
    if (!Number.isInteger(qty) || qty < 0 || qty > MAX_QTY) {
      return { ok: false, error: "수량은 0 이상의 정수로 입력해 주세요." };
    }
    const reason = typeof o.reason === "string" ? o.reason.trim() : "";
    if (!reason) return { ok: false, error: "조정 사유를 입력해 주세요." };
    rows.push({ item_id: itemId, actual_qty: qty, reason });
  }
  return { ok: true, rows };
}
