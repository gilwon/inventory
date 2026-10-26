"use client";
// 서비스 워커를 등록하는 렌더링 없는 컴포넌트 (프로덕션과 localhost 에서만)

import { useEffect } from "react";

export function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const ok =
      process.env.NODE_ENV === "production" ||
      location.hostname === "localhost";
    if (!ok) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {});
  }, []);
  return null;
}
