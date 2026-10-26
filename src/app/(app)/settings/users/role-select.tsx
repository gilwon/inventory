"use client";
// 사용자 한 명의 권한을 바꾸는 선택 상자와 변경 버튼

import { useActionState } from "react";
import { btnSecondary, errCls, inputCls, type FormState } from "../../items/common";
import { setUserRole } from "./actions";

const initial: FormState = { error: null };

export function RoleSelect({
  userId,
  role,
  idPrefix,
  name,
}: {
  userId: string;
  role: string;
  // 모바일 카드와 데스크톱 표가 한 문서에 함께 있으므로 id 가 겹치지 않게 한다.
  idPrefix: string;
  name: string;
}) {
  const [state, formAction, pending] = useActionState(setUserRole, initial);
  const id = `${idPrefix}-role-${userId}`;
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="user_id" value={userId} />
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <label htmlFor={id} className="block text-sm font-medium">
            {name} 권한
          </label>
          <select id={id} name="role" defaultValue={role} className={inputCls}>
            <option value="admin">관리자</option>
            <option value="worker">작업자</option>
          </select>
        </div>
        <button type="submit" disabled={pending} className={btnSecondary}>
          {pending ? "변경 중..." : "변경"}
        </button>
      </div>
      {state.error && (
        <p role="alert" className={errCls}>
          {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="text-sm font-medium text-ink">
          ✓ 권한을 바꿨습니다.
        </p>
      )}
    </form>
  );
}
