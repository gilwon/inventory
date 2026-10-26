// 스캔 코드 해석 규칙 테스트
import { describe, expect, it } from "vitest";
import { escapeLike, normalizeScan, pickScanMatch } from "./scan";

const items = [
  { id: "i1", sku: "AB-100", barcode: "8801234567890" },
  { id: "i2", sku: "ZZ-1", barcode: null },
  { id: "i3", sku: "A-1", barcode: "A-1-BC" },
];
const locs = [
  { id: "l1", code: "WH-A" },
  { id: "l2", code: "ZZ-1" },
];

describe("normalizeScan", () => {
  it("공백을 지우고 문자열이 아니면 빈 문자열", () => {
    expect(normalizeScan("  ab \n")).toBe("ab");
    expect(normalizeScan(null)).toBe("");
    expect(normalizeScan(5)).toBe("");
  });
  it("너무 긴 값은 자른다", () => {
    expect(normalizeScan("x".repeat(500))).toHaveLength(200);
  });
});

describe("escapeLike", () => {
  it("와일드카드를 이스케이프한다", () => {
    expect(escapeLike("a%b_c\\")).toBe("a\\%b\\_c\\\\");
    expect(escapeLike("a*b")).toBe("a_b");
  });
});

describe("pickScanMatch", () => {
  it("SKU로 찾는다", () => {
    expect(pickScanMatch("AB-100", items, locs)).toEqual({ kind: "item", id: "i1" });
  });
  it("바코드로 찾는다", () => {
    expect(pickScanMatch("8801234567890", items, locs)).toEqual({ kind: "item", id: "i1" });
  });
  it("위치 코드로 찾는다", () => {
    expect(pickScanMatch("WH-A", items, locs)).toEqual({ kind: "location", id: "l1" });
  });
  it("공백과 대소문자를 무시한다", () => {
    expect(pickScanMatch("  ab-100 ", items, locs)).toEqual({ kind: "item", id: "i1" });
    expect(pickScanMatch("wh-a", items, locs)).toEqual({ kind: "location", id: "l1" });
  });
  it("SKU가 바코드와 위치 코드보다 먼저다", () => {
    expect(pickScanMatch("ZZ-1", items, locs)).toEqual({ kind: "item", id: "i2" });
    expect(pickScanMatch("a-1", items, locs)).toEqual({ kind: "item", id: "i3" });
  });
  it("빈 문자열과 알 수 없는 코드는 null", () => {
    expect(pickScanMatch("", items, locs)).toBeNull();
    expect(pickScanMatch("   ", items, locs)).toBeNull();
    expect(pickScanMatch("nope", items, locs)).toBeNull();
    expect(pickScanMatch(undefined, items, locs)).toBeNull();
  });
  it("부분 일치는 찾지 않는다", () => {
    expect(pickScanMatch("AB", items, locs)).toBeNull();
  });
});
