"use server";
// 이력 정정 Server Action (반대 방향 이력을 추가하는 RPC만 호출한다)

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { koRpcError } from "../items/common";

export type ReverseResult = { ok: true } | { ok: false; error: string };

export async function reverseMovement(movementId: number): Promise<ReverseResult> {
  if (!Number.isSafeInteger(movementId) || movementId < 1) {
    return { ok: false, error: "잘못된 이력입니다." };
  }
  const supabase = await createClient();
  // 비로그인 요청은 RPC 호출 전에 거절한다.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const { error } = await supabase.rpc("reverse_movement", {
    p_movement_id: movementId,
  });
  if (error) return { ok: false, error: koRpcError(error) };
  revalidatePath("/history");
  return { ok: true };
}
