// 데모 목 클라이언트의 필터·정렬·임베드·count·rpc 동작 테스트
import { describe, expect, it } from "vitest";
import { createDemoClient } from "./client";
import { DEMO_MSG } from "./index";

const db = () => createDemoClient();

describe("데모 클라이언트 질의", () => {
  it("eq 필터와 컬럼 선택", async () => {
    const { data } = await db().from("items").select("sku").eq("sku", "BOX-S");
    expect(data).toEqual([{ sku: "BOX-S" }]);
  });
  it("head count 는 data 없이 개수만 준다", async () => {
    const r = await db().from("items").select("id", { count: "exact", head: true }).eq("active", true);
    expect(r.data).toBeNull();
    expect(r.count).toBe(11);
  });
  it("ilike 는 대소문자를 무시하고 % 를 지원한다", async () => {
    const { data } = await db().from("items").select("sku").ilike("sku", "blt-%");
    expect(data).toEqual([{ sku: "BLT-M8-20" }]);
  });
  it("order 와 limit", async () => {
    const { data } = await db().from("items").select("sku").order("sku", { ascending: false }).limit(2);
    expect(data).toEqual([{ sku: "WSH-M8" }, { sku: "TAPE-OPP" }]);
  });
  it("임베드는 외래 키로 부모 행을 붙인다", async () => {
    const { data } = await db().from("movements").select("id,items(sku),profiles(display_name)").eq("id", 1);
    expect(data).toEqual([{ id: 1, items: { sku: "BLT-M8-20" }, profiles: { display_name: "관리자(데모)" } }]);
  });
  it("items!inner 필터는 부모 조건으로 행을 뺀다", async () => {
    const all = await db().from("stock").select("qty, items!inner(sku,active)").eq("items.active", true);
    const none = await db().from("stock").select("qty, items!inner(sku,active)").eq("items.active", false);
    expect(all.data!.length).toBeGreaterThan(0);
    expect(none.data).toEqual([]);
  });
  it("maybeSingle 은 없으면 null", async () => {
    const { data, error } = await db().from("items").select("*").eq("sku", "없음").maybeSingle();
    expect(data).toBeNull();
    expect(error).toBeNull();
  });
});

describe("데모 클라이언트 rpc와 쓰기", () => {
  it("low_stock_items 는 부족한 양이 큰 순", async () => {
    const { data } = await db().rpc("low_stock_items");
    expect(data!.map((r) => [r.sku, r.shortage])).toEqual([
      ["SCW-M4", 180],
      ["GLV-L", 8],
      ["LBL-A4", 6],
    ]);
  });
  it("search_items 는 부분 일치를 이름순으로 주고 보관 품목을 뺀다", async () => {
    const { data } = await db().rpc("search_items", { q: "m8", lim: 10, off: 0, include_archived: false });
    expect(data!.map((r) => r.sku)).toEqual(["NUT-M8", "BLT-M8-20", "WSH-M8"]);
  });
  it("변경은 데모 메시지 오류를 준다", async () => {
    const r = await db().from("items").update({ name: "x" }).eq("sku", "BOX-S");
    expect(r.error).toEqual({ message: DEMO_MSG });
    expect((await db().rpc("record_receive", {} as never)).error).toEqual({ message: DEMO_MSG });
  });
  it("지원하지 않는 테이블은 throw", () => {
    expect(() => db().from("nope" as never)).toThrow();
  });
});
