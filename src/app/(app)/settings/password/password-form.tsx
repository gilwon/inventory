"use client";
// 새 비밀번호를 두 번 입력받는 폼

import { useActionState } from "react";
import { btnPrimary, errCls, inputCls, type FormState } from "../../items/common";
import { changePassword } from "./actions";

const initial: FormState = { error: null };

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, initial);
  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div className="space-y-1">
        <label htmlFor="pw-new" className="block text-sm font-medium">
          새 비밀번호 (8자 이상)
        </label>
        <input
          id="pw-new"
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          className={inputCls}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="pw-confirm" className="block text-sm font-medium">
          새 비밀번호 확인
        </label>
        <input
          id="pw-confirm"
          name="confirm"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          className={inputCls}
        />
      </div>
      {state.error && (
        <p role="alert" className={errCls}>
          {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="text-sm font-medium text-ink">
          ✓ 비밀번호를 바꿨습니다.
        </p>
      )}
      <button type="submit" disabled={pending} className={`${btnPrimary} w-full sm:w-auto`}>
        {pending ? "바꾸는 중..." : "비밀번호 바꾸기"}
      </button>
    </form>
  );
}
