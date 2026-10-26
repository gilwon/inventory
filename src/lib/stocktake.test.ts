// 실사 변경 행 추출과 입력 검증 테스트
import { describe, expect, it } from "vitest";
import { collectChangedRows, parseQty, validateRows } from "./stocktake";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const books = [
  { id: A, qty: 5 },
  { id: B, qty: 3 },
];

describe("collectChangedRows", () => {
  it("비었거나 장부와 같은 행은 제외한다", () => {
    const r = collectChangedRows(books, {
      [A]: { actual: "5", reason: "" },
      [B]: { actual: "", reason: "" },
    });
    expect(r.rows).toEqual([]);
    expect(r.changed).toBe(0);
    expect(r.errors).toEqual({});
  });

  it("다른 행만 사유와 함께 담는다", () => {
    const r = collectChangedRows(books, {
      [A]: { actual: "4", reason: " 파손 " },
      [B]: { actual: "3", reason: "" },
    });
    expect(r.rows).toEqual([{ item_id: A, actual_qty: 4, reason: "파손" }]);
  });

  it("사유가 없으면 오류이고 rows 에서 빠진다", () => {
    const r = collectChangedRows(books, { [A]: { actual: "4", reason: " " } });
    expect(r.rows).toEqual([]);
    expect(r.changed).toBe(1);
    expect(r.errors[A].reason).toBeTruthy();
  });

  it("소수와 음수는 수량 오류", () => {
    const r = collectChangedRows(books, {
      [A]: { actual: "1.5", reason: "x" },
      [B]: { actual: "-1", reason: "x" },
    });
    expect(r.errors[A].qty).toBeTruthy();
    expect(r.errors[B].qty).toBeTruthy();
    expect(r.rows).toEqual([]);
  });

  it("201건이 바뀌면 전체 오류", () => {
    const many = Array.from({ length: 201 }, (_, i) => ({ id: `i${i}`, qty: 0 }));
    const inputs = Object.fromEntries(
      many.map((m) => [m.id, { actual: "1", reason: "r" }]),
    );
    expect(collectChangedRows(many, inputs).error).toContain("200");
  });
});

describe("validateRows", () => {
  it("정상 행은 통과한다", () => {
    const r = validateRows([{ item_id: A, actual_qty: 0, reason: "분실" }]);
    expect(r.ok).toBe(true);
  });
  it("사유 누락, 소수, 음수, uuid 오류, 중복을 거절한다", () => {
    expect(validateRows([{ item_id: A, actual_qty: 1, reason: "" }]).ok).toBe(false);
    expect(validateRows([{ item_id: A, actual_qty: 1.5, reason: "r" }]).ok).toBe(false);
    expect(validateRows([{ item_id: A, actual_qty: -1, reason: "r" }]).ok).toBe(false);
    expect(validateRows([{ item_id: "x", actual_qty: 1, reason: "r" }]).ok).toBe(false);
    const row = { item_id: A, actual_qty: 1, reason: "r" };
    expect(validateRows([row, row]).ok).toBe(false);
  });
  it("200행 초과와 빈 배열을 거절한다", () => {
    expect(validateRows([]).ok).toBe(false);
    const rows = Array.from({ length: 201 }, () => ({ item_id: A, actual_qty: 1, reason: "r" }));
    expect(validateRows(rows).ok).toBe(false);
  });
});

describe("parseQty", () => {
  it("정수만 받는다", () => {
    expect(parseQty("0")).toBe(0);
    expect(parseQty("12")).toBe(12);
    expect(parseQty("1e3")).toBeNull();
    expect(parseQty("2147483648")).toBeNull();
  });
});
