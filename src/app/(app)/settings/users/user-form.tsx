"use client";
// 팀원 계정 만들기 폼 (임시 비밀번호는 화면에 다시 보이지 않는다)

import { useActionState } from "react";
import { btnPrimary, errCls, inputCls } from "../../items/common";
import { createUser, type CreateUserState } from "./actions";

const initial: CreateUserState = { error: null };

export function UserForm() {
  const [state, formAction, pending] = useActionState(createUser, initial);
  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div className="space-y-1">
        <label htmlFor="u-email" className="block text-sm font-medium">
          이메일
        </label>
        <input
          id="u-email"
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="off"
          defaultValue={state.values?.email}
          className={inputCls}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="u-password" className="block text-sm font-medium">
          임시 비밀번호 (8자 이상)
        </label>
        <input
          id="u-password"
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
        <label htmlFor="u-name" className="block text-sm font-medium">
          표시 이름
        </label>
        <input
          id="u-name"
          name="display_name"
          required
          maxLength={50}
          autoComplete="off"
          defaultValue={state.values?.displayName}
          className={inputCls}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="u-role" className="block text-sm font-medium">
          권한
        </label>
        <select
          id="u-role"
          name="role"
          defaultValue={state.values?.role || "worker"}
          className={inputCls}
        >
          <option value="worker">작업자</option>
          <option value="admin">관리자</option>
        </select>
      </div>

      {state.error && (
        <p role="alert" className={errCls}>
          {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="text-sm font-medium text-ink">
          ✓ 계정을 만들었습니다. 임시 비밀번호는 다시 볼 수 없으니 관리자가 직접 전달하세요.
        </p>
      )}
      <button type="submit" disabled={pending} className={`${btnPrimary} w-full sm:w-auto`}>
        {pending ? "만드는 중..." : "계정 만들기"}
      </button>
    </form>
  );
}
