"use server";
// 일괄 실사 제출 Server Action (record_stocktake RPC 한 번 호출)

import { revalidatePath } from "next/cache";
import { DEMO_MSG, isDemo } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";
import { validateRows } from "@/lib/stocktake";
import { isUuid, koRpcError } from "../items/common";

export type StocktakeResult =
  | { ok: true; changed: number }
  | { ok: false; error: string };

// 장부와 다른 행만 받는다. 한 건이라도 실패하면 DB 가 전체를 롤백하고 'SKU: 메시지' 를 돌려준다.
export async function submitStocktake(
  locationId: string,
  rows: unknown,
): Promise<StocktakeResult> {
  if (await isDemo()) return { ok: false, error: DEMO_MSG };
  if (!isUuid(String(locationId))) {
    return { ok: false, error: "위치를 선택해 주세요." };
  }
  const v = validateRows(rows);
  if (!v.ok) return v;

  const supabase = await createClient();
  // 비로그인 요청은 RPC 호출 전에 거절한다.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data, error } = await supabase.rpc("record_stocktake", {
    p_location_id: locationId,
    p_rows: v.rows,
  });
  if (error) return { ok: false, error: koRpcError(error) };

  revalidatePath("/stocktake");
  revalidatePath("/");
  return { ok: true, changed: data ?? 0 };
}
