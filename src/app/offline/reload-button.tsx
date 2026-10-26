"use client";
// 오프라인 안내 화면의 다시 시도 버튼 (새로고침)

import { btnPrimary } from "@/app/(app)/items/common";

export function ReloadButton() {
  return (
    <button type="button" className={btnPrimary} onClick={() => location.reload()}>
      다시 시도
    </button>
  );
}
