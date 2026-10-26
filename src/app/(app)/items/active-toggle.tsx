"use client";
// 품목·위치의 보관/복원 버튼 (Server Action 결과 오류를 버튼 아래에 표시)

import { useActionState } from "react";
import { btnSecondary, errCls, type FormState } from "./common";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  id: string;
  active: boolean;
};

export function ActiveToggle({ action, id, active }: Props) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={active ? "0" : "1"} />
      <button type="submit" disabled={pending} className={btnSecondary}>
        {pending ? "처리 중..." : active ? "보관" : "복원"}
      </button>
      {state.error && (
        <p role="alert" className={errCls}>
          {state.error}
        </p>
      )}
    </form>
  );
}
