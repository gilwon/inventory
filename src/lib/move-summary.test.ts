// 입출고 검증 오류 목록과 요약·버튼 문구 테스트
import { describe, expect, it } from "vitest";
import { moveButtonLabel, moveSummary, validateMove } from "./move-summary";

const base = {
  tab: "issue" as const,
  hasItem: true,
  locId: "a",
  toLocId: "",
  qtyNum: 3,
  current: 5,
  unit: "개",
  reason: "",
};

describe("validateMove", () => {
  it("오류가 없으면 빈 객체", () => {
    expect(validateMove(base)).toEqual({});
  });
  it("여러 칸의 오류를 모두 돌려준다", () => {
    const e = validateMove({ ...base, hasItem: false, locId: "", qtyNum: null });
    expect(Object.keys(e)).toEqual(["item", "loc", "qty"]);
  });
  it("이동은 도착 위치 미선택과 같은 위치를 구분한다", () => {
    const t = { ...base, tab: "transfer" as const };
    expect(validateMove(t).toLoc).toBe("도착 위치를 선택해 주세요.");
    expect(validateMove({ ...t, toLocId: "a" }).toLoc).toBe("출발 위치와 도착 위치가 같습니다.");
  });
  it("재고 초과는 수량 오류 하나로 합친다", () => {
    expect(validateMove({ ...base, qtyNum: 9 }).qty).toContain("현재 수량(5 개)");
  });
  it("조정은 0을 허용하고 사유를 요구한다", () => {
    const e = validateMove({ ...base, tab: "adjust", qtyNum: 0 });
    expect(e.qty).toBeUndefined();
    expect(e.reason).toBe("조정 사유를 입력해 주세요.");
  });
});

describe("moveSummary", () => {
  const s = { tab: "issue" as const, itemLabel: "TEST-001 테스트볼트", locPath: "창고A", toPath: "", qtyNum: 3, current: 5, unit: "개" };
  it("출고 한 줄 요약", () => {
    expect(moveSummary(s)).toBe("TEST-001 테스트볼트 · 창고A · 3 개 출고");
  });
  it("덜 채워지면 안내한다", () => {
    expect(moveSummary({ ...s, itemLabel: null })).toBe("품목과 위치를 선택하세요");
    expect(moveSummary({ ...s, qtyNum: null })).toContain("수량을 입력하세요");
  });
  it("이동은 출발 → 도착", () => {
    expect(moveSummary({ ...s, tab: "transfer", toPath: "창고B" })).toContain("창고A → 창고B · 3 개 이동");
  });
  it("조정은 현재 → 실제와 차이", () => {
    expect(moveSummary({ ...s, tab: "adjust", qtyNum: 8 })).toContain("현재 5 개 → 실제 8 개 (차이 +3)");
  });
});

describe("moveButtonLabel", () => {
  it("수량이 있으면 작업 내용을 담는다", () => {
    expect(moveButtonLabel("issue", 3, "개")).toBe("3 개 출고 기록");
    expect(moveButtonLabel("issue", null, "개")).toBe("출고 기록");
  });
});
