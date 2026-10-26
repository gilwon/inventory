"use client";
// 이메일+비밀번호 로그인 화면 (가입 링크 없음)

import { useActionState } from "react";
import { LoginCard } from "@/components/lucian/login-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { login, type LoginState } from "./actions";

const initial: LoginState = { error: null };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initial);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-8">
      <div className="fixed right-4 top-4">
        <ThemeToggle />
      </div>
      <LoginCard formAction={formAction} state={state} pending={pending} />
    </main>
  );
}
