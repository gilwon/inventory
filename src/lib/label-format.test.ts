// label-format 순수 함수 단위 테스트
import { describe, expect, it } from "vitest";
import { canBarcode, isLabelFormat, unsupportedCodes } from "./label-format";

describe("canBarcode", () => {
  it("영문·숫자·기호는 가능하다", () => {
    expect(canBarcode("ABC-123")).toBe(true);
  });
  it("공백을 포함한 ASCII는 가능하다", () => {
    expect(canBarcode("AB CD 12")).toBe(true);
  });
  it("한글이 있으면 불가능하다", () => {
    expect(canBarcode("볼트-01")).toBe(false);
  });
  it("빈 문자열은 불가능하다", () => {
    expect(canBarcode("")).toBe(false);
  });
  it("24자는 가능하고 25자는 불가능하다", () => {
    expect(canBarcode("A".repeat(24))).toBe(true);
    expect(canBarcode("A".repeat(25))).toBe(false);
  });
  it("제어 문자와 DEL은 불가능하다", () => {
    expect(canBarcode("A\tB")).toBe(false);
    expect(canBarcode("A\u007fB")).toBe(false);
  });
});

describe("unsupportedCodes", () => {
  it("불가능한 코드만 중복 없이 입력 순서대로 돌려준다", () => {
    expect(unsupportedCodes(["OK-1", "한글", "B".repeat(25), "한글", "OK-2"])).toEqual([
      "한글",
      "B".repeat(25),
    ]);
  });
  it("모두 가능하면 빈 배열이다", () => {
    expect(unsupportedCodes(["A", "B"])).toEqual([]);
  });
});

describe("isLabelFormat", () => {
  it("qr, barcode만 허용한다", () => {
    expect(isLabelFormat("qr")).toBe(true);
    expect(isLabelFormat("barcode")).toBe(true);
    expect(isLabelFormat("ean")).toBe(false);
    expect(isLabelFormat(undefined)).toBe(false);
  });
});
