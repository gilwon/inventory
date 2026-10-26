"use server";
// 로그인과 로그아웃 Server Action

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_COOKIE } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "이메일과 비밀번호를 입력해 주세요." };
  }

  // 데모 쿠키가 남아 있으면 목 클라이언트가 로그인을 막으므로 먼저 지운다.
  (await cookies()).delete(DEMO_COOKIE);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      error:
        error.status === 400
          ? "이메일 또는 비밀번호가 올바르지 않습니다."
          : "로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }
  redirect("/");
}

// 데모 쿠키를 심고 대시보드로 보낸다. 쿠키는 인증이 아니라 목데이터 모드 표시다.
export async function startDemo() {
  (await cookies()).set(DEMO_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  redirect("/");
}

export async function exitDemo() {
  (await cookies()).delete(DEMO_COOKIE);
  redirect("/login");
}

export async function logout() {
  (await cookies()).delete(DEMO_COOKIE);
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
