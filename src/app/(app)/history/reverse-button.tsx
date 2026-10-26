"use client";
// 이력 행의 정정 버튼 (확인 후 정정 Server Action 호출, 오류는 행 안에 표시)

import { useState, useTransition } from "react";
import { reverseMovement } from "./actions";

export function ReverseButton({ movementId }: { movementId: number }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!window.confirm("이 이력을 정정할까요? 반대 방향 이력이 추가됩니다.")) return;
    setError(null);
    startTransition(async () => {
      const res = await reverseMovement(movementId);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="min-h-11 rounded-md border border-zinc-500 px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 disabled:opacity-60 dark:border-zinc-500 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus-visible:ring-blue-400"
      >
        {pending ? "정정 중..." : "정정"}
      </button>
      {error && (
        <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
