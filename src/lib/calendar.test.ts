// 달력 날짜 계산·집계 순수 함수 테스트
import { describe, expect, it } from "vitest";
import { kstDay, kstLabel, monthGrid, monthKey, monthRangeIso, parseDay, parseMonth, shiftMonth, tallyByDay } from "./calendar";

describe("parseMonth/monthKey/shiftMonth", () => {
  it("실제 달만 허용한다", () => {
    expect(parseMonth("2026-02")).toEqual({ year: 2026, month: 2 });
    for (const s of ["", "abc", "2026-13", "2026-00", "2026-2", "2026-02-01"]) expect(parseMonth(s)).toBeNull();
  });
  it("연도 경계를 넘겨 이동한다", () => {
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(monthKey(2026, 3)).toBe("2026-03");
  });
});

describe("parseDay", () => {
  it("해당 월 안의 실제 날짜만 허용한다", () => {
    expect(parseDay("2026-10-24", 2026, 10)).toBe("2026-10-24");
    expect(parseDay("2024-02-29", 2024, 2)).toBe("2024-02-29");
    for (const s of ["", "abc", "2026-11-03", "2026-10-32", "2026-02-30", "2026-10-4"]) {
      expect(parseDay(s, 2026, 10)).toBeNull();
    }
  });
});

describe("monthGrid", () => {
  it("일요일 시작 42칸이다", () => {
    const g = monthGrid(2026, 10); // 2026-10-01 은 목요일
    expect(g).toHaveLength(42);
    expect(g[0]).toBe("2026-09-27");
    expect(g[4]).toBe("2026-10-01");
    expect(g[41]).toBe("2026-11-07");
  });
  it("윤년 2월 29일을 포함한다", () => {
    expect(monthGrid(2024, 2)).toContain("2024-02-29");
    expect(monthGrid(2026, 2)).not.toContain("2026-02-29");
  });
});

describe("kstDay/monthRangeIso", () => {
  it("KST 자정 직전·직후를 가른다", () => {
    expect(kstDay("2026-03-31T14:59:59.999Z")).toBe("2026-03-31");
    expect(kstDay("2026-03-31T15:00:00.000Z")).toBe("2026-04-01");
    expect(kstDay("bad")).toBe("");
  });
  it("kstLabel 은 KST 월일 시각 문구를 만든다", () => {
    expect(kstLabel("2026-10-27T05:30:00Z")).toBe("10월 27일 14:30");
    expect(kstLabel("2026-12-31T15:05:00Z")).toBe("1월 1일 00:05");
    expect(kstLabel("bad")).toBe("");
  });
  it("월 경계를 KST 로 계산한다", () => {
    expect(monthRangeIso(2026, 3)).toEqual({
      from: "2026-02-28T15:00:00.000Z",
      to: "2026-03-31T14:59:59.999Z",
    });
    expect(monthRangeIso(2026, 12).to).toBe("2026-12-31T14:59:59.999Z");
  });
});

describe("tallyByDay", () => {
  it("이동은 transfer_out 만, 정정은 조정에 센다", () => {
    const at = "2026-03-10T03:00:00Z";
    const m = tallyByDay([
      { type: "receive", reverses_id: null, created_at: at },
      { type: "issue", reverses_id: null, created_at: at },
      { type: "transfer_out", reverses_id: null, created_at: at },
      { type: "transfer_in", reverses_id: null, created_at: at },
      { type: "adjust", reverses_id: null, created_at: at },
      { type: "adjust", reverses_id: 5, created_at: at },
      { type: "import", reverses_id: null, created_at: at },
      { type: "x", reverses_id: null, created_at: at },
    ]);
    expect(m.get("2026-03-10")).toEqual({ receive: 1, issue: 1, transfer: 1, adjust: 2, import: 1 });
  });
});
