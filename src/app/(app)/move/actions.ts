"use server";
// 품목 검색, 현재 수량 조회, 입고·출고·이동·조정 제출 Server Action

import { DEMO_MSG, isDemo } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";
import { koRpcError } from "../items/common";

export type ItemHit = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  total_qty: number;
};

export type MoveInput = {
  type: "receive" | "issue" | "transfer" | "adjust";
  itemId: string;
  locationId: string;
  toLocationId?: string;
  qty: string;
  reason: string;
};

export type MoveResult =
  | { ok: true; unchanged?: boolean }
  | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// DB 정수 열(int)의 최댓값
const MAX_QTY = 2147483647;

// 품목 선택용 검색. 보관 품목은 DB 함수가 기본으로 뺀다.
export async function searchItemsAction(q: string): Promise<ItemHit[]> {
  const term = String(q ?? "").trim().slice(0, 100);
  if (!term) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase.rpc("search_items", {
    q: term,
    lim: 8,
    off: 0,
    include_archived: false,
  });
  return (data ?? []).map((r) => ({
    id: r.id,
    sku: r.sku,
    name: r.name,
    unit: r.unit,
    total_qty: r.total_qty,
  }));
}

// 품목×위치의 현재 수량. 조회에 실패하면 null.
export async function getStockAction(
  itemId: string,
  locationId: string,
): Promise<number | null> {
  if (!UUID.test(String(itemId)) || !UUID.test(String(locationId))) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("stock")
    .select("qty")
    .eq("item_id", itemId)
    .eq("location_id", locationId)
    .maybeSingle();
  if (error) return null;
  return data?.qty ?? 0;
}

// 수량 변경은 RPC만 호출한다. DB 오류 메시지(한국어)를 그대로 돌려준다.
export async function submitMovement(input: MoveInput): Promise<MoveResult> {
  if (await isDemo()) return { ok: false, error: DEMO_MSG };
  const { type, itemId, locationId, toLocationId } = input ?? {};
  const qtyText = String(input?.qty ?? "").trim();
  const reason = String(input?.reason ?? "").trim();

  if (!UUID.test(String(itemId)) || !UUID.test(String(locationId))) {
    return { ok: false, error: "품목과 위치를 선택해 주세요." };
  }
  if (!/^\d+$/.test(qtyText) || Number(qtyText) > MAX_QTY) {
    return { ok: false, error: "수량은 0 이상의 정수로 입력해 주세요." };
  }
  const qty = Number(qtyText);
  if (type !== "adjust" && qty < 1) {
    return { ok: false, error: "수량은 1 이상이어야 합니다." };
  }

  const supabase = await createClient();
  // 비로그인 요청은 RPC 호출 전에 거절한다.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const reasonArg = reason || undefined;

  if (type === "receive" || type === "issue") {
    const { error } = await supabase.rpc(
      type === "receive" ? "record_receive" : "record_issue",
      { p_item_id: itemId, p_location_id: locationId, p_qty: qty, p_reason: reasonArg },
    );
    return error ? { ok: false, error: koRpcError(error) } : { ok: true };
  }

  if (type === "transfer") {
    if (!UUID.test(String(toLocationId))) {
      return { ok: false, error: "도착 위치를 선택해 주세요." };
    }
    if (toLocationId === locationId) {
      return { ok: false, error: "출발 위치와 도착 위치가 같습니다." };
    }
    const { error } = await supabase.rpc("record_transfer", {
      p_item_id: itemId,
      p_from_location_id: locationId,
      p_to_location_id: toLocationId as string,
      p_qty: qty,
      p_reason: reasonArg,
    });
    return error ? { ok: false, error: koRpcError(error) } : { ok: true };
  }

  if (type === "adjust") {
    if (!reason) return { ok: false, error: "조정 사유를 입력해 주세요." };
    const { data, error } = await supabase.rpc("record_adjust", {
      p_item_id: itemId,
      p_location_id: locationId,
      p_actual_qty: qty,
      p_reason: reason,
    });
    if (error) return { ok: false, error: koRpcError(error) };
    return { ok: true, unchanged: data === 0 };
  }

  return { ok: false, error: "알 수 없는 작업 유형입니다." };
}
