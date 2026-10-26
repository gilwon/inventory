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
        className="w-full max-w-sm space-y-4 rounded-lg border border-zinc-300 bg-white p-6 text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
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
            className="block w-full min-w-0 rounded-md border border-zinc-400 bg-white px-3 py-2 text-base text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:focus-visible:ring-blue-400"
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
            className="block w-full min-w-0 rounded-md border border-zinc-400 bg-white px-3 py-2 text-base text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:focus-visible:ring-blue-400"
          />
        </div>

        {state.error && (
          <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 disabled:opacity-60 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-zinc-900"
        >
          {pending ? "로그인 중..." : "로그인"}
        </button>
      </form>
    </main>
  );
}
