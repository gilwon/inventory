// 엑셀 가져오기 검증 함수의 최소 케이스 테스트
import { describe, expect, it } from "vitest";
import { validateWorkbook } from "./validate";
import type { ItemRow, LocationRow, ParsedWorkbook, Snapshot } from "./schema";

const loc = (row: number, code: string, parentCode = ""): LocationRow => ({
  row,
  code,
  name: `이름${code}`,
  parentCode,
});
const item = (row: number, o: Partial<ItemRow>): ItemRow => ({
  row,
  sku: "",
  name: "품목",
  barcode: "",
  unit: "",
  minQty: "",
  memo: "",
  locationCode: "",
  qty: "",
  ...o,
});
const snap = (o: Partial<Snapshot> = {}): Snapshot => ({
  locations: new Map(),
  items: new Map(),
  barcodes: new Map(),
  stocks: new Set(),
  ...o,
});
const run = (p: Partial<ParsedWorkbook>, s = snap()) =>
  validateWorkbook({ locations: [], items: [], ...p }, s);

describe("validateWorkbook", () => {
  it("신규 위치와 신규 품목은 new, payload 수량은 숫자", () => {
    const r = run({
      locations: [loc(2, "A")],
      items: [item(2, { sku: "S1", locationCode: "a", qty: "5" })],
    });
    expect(r.rows.map((x) => x.status)).toEqual(["new", "new"]);
    expect(r.payload?.stocks).toEqual([{ sku: "S1", location_code: "a", qty: 5 }]);
  });

  it("기존 SKU 는 update, 기존 위치는 existing", () => {
    const r = run(
      { locations: [loc(2, "A")], items: [item(2, { sku: "s1" })] },
      snap({ locations: new Map([["a", true]]), items: new Map([["s1", true]]) }),
    );
    expect(r.rows.map((x) => x.status)).toEqual(["existing", "update"]);
    expect(r.payload?.locations).toEqual([]);
    expect(r.itemsUpdated).toBe(1);
  });

  it("수량 무시됨 행도 기존 품목이면 갱신에 세고 같은 SKU는 한 번만 센다", () => {
    const r = run(
      {
        items: [
          item(2, { sku: "S1", locationCode: "A", qty: "3" }),
          item(3, { sku: "s1", locationCode: "B", qty: "4" }),
          item(4, { sku: "S2" }),
        ],
      },
      snap({
        locations: new Map([["a", true], ["b", true]]),
        items: new Map([["s1", true]]),
        stocks: new Set(["s1|a", "s1|b"]),
      }),
    );
    expect(r.rows.map((x) => x.status)).toEqual(["ignored", "ignored", "new"]);
    expect(r.itemsUpdated).toBe(1);
  });

  it("이미 수량이 있는 조합은 ignored", () => {
    const r = run(
      { items: [item(2, { sku: "S1", locationCode: "A", qty: "3" })] },
      snap({
        locations: new Map([["a", true]]),
        items: new Map([["s1", true]]),
        stocks: new Set(["s1|a"]),
      }),
    );
    expect(r.rows[0].status).toBe("ignored");
    expect(r.hasError).toBe(false);
  });

  it("없는 위치 코드는 오류이고 payload 가 없다", () => {
    const r = run({ items: [item(2, { sku: "S1", locationCode: "ZZ", qty: "1" })] });
    expect(r.rows[0].status).toBe("error");
    expect(r.rows[0].reason).toContain("존재하지 않는 위치");
    expect(r.payload).toBeNull();
  });

  it("음수와 정수가 아닌 수량은 오류", () => {
    const s = snap({ locations: new Map([["a", true]]) });
    const r = run(
      {
        items: [
          item(2, { sku: "S1", locationCode: "A", qty: "-1" }),
          item(3, { sku: "S2", locationCode: "A", qty: "1.5" }),
        ],
      },
      s,
    );
    expect(r.rows.map((x) => x.status)).toEqual(["error", "error"]);
  });

  it("바코드 충돌은 파일 안과 DB 모두 오류", () => {
    const inFile = run({
      items: [item(2, { sku: "S1", barcode: "B1" }), item(3, { sku: "S2", barcode: "b1" })],
    });
    expect(inFile.rows[1].status).toBe("error");
    const inDb = run(
      { items: [item(2, { sku: "S1", barcode: "B1" })] },
      snap({ barcodes: new Map([["b1", "other"]]) }),
    );
    expect(inDb.rows[0].status).toBe("error");
  });

  it("같은 SKU 이름 불일치와 같은 (SKU, 위치) 중복은 오류", () => {
    const s = snap({ locations: new Map([["a", true]]) });
    const r = run(
      {
        items: [
          item(2, { sku: "S1", name: "가", locationCode: "A", qty: "1" }),
          item(3, { sku: "s1", name: "나" }),
          item(4, { sku: "S1", name: "가", locationCode: "a", qty: "2" }),
        ],
      },
      s,
    );
    expect(r.rows.map((x) => x.status)).toEqual(["new", "error", "error"]);
  });

  it("위치 순환은 오류", () => {
    const r = run({ locations: [loc(2, "A", "B"), loc(3, "B", "A")] });
    expect(r.rows.map((x) => x.status)).toEqual(["error", "error"]);
  });
});
