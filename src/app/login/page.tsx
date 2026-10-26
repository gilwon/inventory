"use client";
// 이메일+비밀번호 로그인 화면 (가입 링크 없음)

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initial: LoginState = { error: null };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initial);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-8">
      <form
        action={formAction}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-line bg-surface p-6 text-ink shadow-sm"
      >
        <h1 className="text-xl font-bold">재고 관리 로그인</h1>

        <div className="space-y-1">
          <label htmlFor="email" className="block text-sm font-medium">
            이메일
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="block w-full min-w-0 rounded-xl border border-ink-3 bg-surface px-3 py-2 text-base text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="block text-sm font-medium">
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="block w-full min-w-0 rounded-xl border border-ink-3 bg-surface px-3 py-2 text-base text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>

        {state.error && (
          <p role="alert" className="text-sm font-medium text-danger">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-accent px-4 py-2 font-medium text-accent-ink hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-60"
        >
          {pending ? "로그인 중..." : "로그인"}
        </button>
      </form>
    </main>
  );
}
