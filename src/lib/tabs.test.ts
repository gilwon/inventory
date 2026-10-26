// 하단 탭/더보기 분리 규칙 테스트
import { describe, expect, it } from "vitest";
import { splitTabs } from "./tabs";

const items = ["/", "/items", "/locations", "/move", "/scan"].map((href) => ({ href }));

describe("splitTabs", () => {
  it("탭은 지정한 순서로, 더보기는 원래 순서로 나눈다", () => {
    const { tabs, more } = splitTabs(items, ["/", "/items", "/scan", "/move"]);
    expect(tabs.map((t) => t.href)).toEqual(["/", "/items", "/scan", "/move"]);
    expect(more.map((m) => m.href)).toEqual(["/locations"]);
  });

  it("목록에 없는 경로는 건너뛴다", () => {
    expect(splitTabs(items, ["/none", "/"]).tabs.map((t) => t.href)).toEqual(["/"]);
  });
});
