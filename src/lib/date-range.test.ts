// 기간 선택 달력 날짜 함수 테스트
import { describe, expect, it } from "vitest";
import { addDays, monthCells, parseKey, shiftMonth, spanDays, summarize, todayKey } from "./date-range";

describe("monthCells", () => {
  it("윤년 2월은 29일까지 칸이 있다", () => {
    const days = monthCells(2024, 1).filter(Boolean);
    expect(days).toHaveLength(29);
    expect(days[28]).toBe("2024-02-29");
    expect(monthCells(2026, 1).filter(Boolean)).toHaveLength(28);
  });

  it("일요일 시작이라 2026-10-01(목)은 다섯 번째 칸이다", () => {
    const cells = monthCells(2026, 9);
    expect(cells).toHaveLength(42);
    expect(cells.slice(0, 4)).toEqual([null, null, null, null]);
    expect(cells[4]).toBe("2026-10-01");
  });
});

describe("월 경계", () => {
  it("addDays는 월과 해를 넘는다", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2024-02-28", 2)).toBe("2024-03-01");
  });

  it("shiftMonth는 해를 넘는다", () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ y: 2027, m: 0 });
    expect(shiftMonth(2026, 0, -1)).toEqual({ y: 2025, m: 11 });
  });

  it("parseKey는 없는 날짜를 거절한다", () => {
    expect(parseKey("2026-02-29")).toBeNull();
    expect(parseKey("2024-02-29")).toEqual({ y: 2024, m: 1, d: 29 });
  });
});

describe("요약", () => {
  it("양 끝 날짜를 포함한 일수를 센다", () => {
    expect(spanDays("2026-10-01", "2026-10-26")).toBe(26);
    expect(summarize("2026-10-01", "2026-10-26")).toBe("2026-10-01 ~ 2026-10-26, 26일");
    expect(summarize("2026-10-05", "2026-10-05")).toBe("2026-10-05 ~ 2026-10-05, 1일");
  });

  it("from만 있으면 종료일 없이 요약한다", () => {
    expect(summarize("2026-10-01", "")).toBe("2026-10-01부터");
    expect(summarize("", "")).toBe("기간을 고르지 않았습니다");
  });
});

describe("todayKey", () => {
  it("로컬 날짜를 그대로 문자열로 만든다", () => {
    expect(todayKey(new Date(2026, 9, 26, 0, 30))).toBe("2026-10-26");
  });
});
