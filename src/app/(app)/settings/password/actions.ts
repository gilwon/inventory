"use server";
// 로그인한 사용자가 자기 비밀번호를 바꾸는 Server Action

import { redirect } from "next/navigation";
import { DEMO_MSG, isDemo } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "../../items/common";

export async function changePassword(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  if (await isDemo()) return { error: DEMO_MSG };
  // 비밀번호는 공백도 값이므로 다듬지 않는다.
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");

  if (password.length < 8) return { error: "비밀번호는 8자 이상이어야 합니다." };
  if (password.length > 72) return { error: "비밀번호는 72자 이하여야 합니다." };
  if (password !== confirm) return { error: "비밀번호가 서로 일치하지 않습니다." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password")
      return { error: "현재 비밀번호와 다른 비밀번호를 입력해 주세요." };
    if (error.code === "weak_password")
      return { error: "너무 쉬운 비밀번호입니다. 다른 비밀번호를 입력해 주세요." };
    return { error: "비밀번호를 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  return { error: null, ok: true };
}
