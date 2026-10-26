"use server";
// 사용자 계정 만들기(Edge Function 호출)와 권한 변경(RPC) Server Action

import { revalidatePath } from "next/cache";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth";
import { DEMO_MSG, isDemo } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";
import { isUuid, koRpcError, type FormState } from "../../items/common";

export type CreateUserState = FormState & {
  // 실패했을 때 입력칸을 다시 채우기 위한 값 (비밀번호는 담지 않는다)
  values?: { email: string; displayName: string; role: string };
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

export async function createUser(
  _prev: CreateUserState,
  fd: FormData,
): Promise<CreateUserState> {
  if (await isDemo()) return { error: DEMO_MSG };
  const guard = await requireAdmin();
  if (!guard.ok) return { error: guard.error };

  const email = text(fd, "email");
  const displayName = text(fd, "display_name");
  const role = text(fd, "role");
  // 비밀번호는 공백도 값이므로 다듬지 않는다.
  const password = String(fd.get("password") ?? "");
  const values = { email, displayName, role };

  if (!email || email.length > 254 || !EMAIL_RE.test(email))
    return { error: "이메일 형식이 올바르지 않습니다.", values };
  if (password.length < 8 || password.length > 72)
    return { error: "임시 비밀번호는 8자 이상 72자 이하로 입력해 주세요.", values };
  if (displayName.length < 1 || displayName.length > 50)
    return { error: "표시 이름은 1자 이상 50자 이하로 입력해 주세요.", values };
  if (role !== "admin" && role !== "worker")
    return { error: "권한을 선택해 주세요.", values };

  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke("create-user", {
    body: { email, password, display_name: displayName, role },
  });

  if (error) {
    // 함수가 준 한국어 error 만 그대로 보인다.
    let message = "계정을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.";
    if (error instanceof FunctionsHttpError) {
      try {
        const body = await error.context.json();
        if (typeof body?.error === "string" && /[가-힣]/.test(body.error))
          message = body.error;
      } catch {
        // 본문을 읽지 못하면 일반 문구를 쓴다.
      }
    }
    return { error: message, values };
  }
  if (data?.error && typeof data.error === "string")
    return { error: data.error, values };

  revalidatePath("/settings/users");
  return { error: null, ok: true };
}

export async function setUserRole(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  if (await isDemo()) return { error: DEMO_MSG };
  const guard = await requireAdmin();
  if (!guard.ok) return { error: guard.error };

  const id = text(fd, "user_id");
  const role = text(fd, "role");
  if (!isUuid(id) || (role !== "admin" && role !== "worker"))
    return { error: "잘못된 요청입니다." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_role", {
    p_user_id: id,
    p_role: role,
  });
  if (error) return { error: koRpcError(error) };
  revalidatePath("/settings/users");
  return { error: null, ok: true };
}
