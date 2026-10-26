// Lucian UX/UI Prompt #072 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#072
// 종류(오류·경고·안내·성공)마다 색과 아이콘이 다른 인라인 알림 한 줄. 서버 컴포넌트에서도 쓴다.

import "./inline-alert.css";

type Kind = "error" | "warn" | "info" | "success";

const COLOR: Record<Kind, string> = {
  error: "var(--ux-danger)",
  warn: "var(--ux-warn)",
  info: "var(--ux-accent)",
  success: "var(--ux-mint)",
};

// 라이브러리 아이콘 경로(16x16)
const ICON: Record<Kind, string> = {
  error: "M8 4.5v4M8 11.2h.01",
  warn: "M8 2.5l6 10.5H2zM8 7v2.5M8 11.3h.01",
  info: "M8 7.5v4M8 4.8h.01",
  success: "M4 8.4l2.6 2.6L12 5.5",
};

export function InlineAlert({
  kind = "error",
  role,
  children,
}: {
  kind?: Kind;
  // 기본은 오류가 alert, 나머지가 status. null 이면 role 을 붙이지 않는다(이미 live 영역 안일 때).
  role?: "alert" | "status" | null;
  children: React.ReactNode;
}) {
  const r = role === undefined ? (kind === "error" ? "alert" : "status") : role;
  return (
    <div
      className="ux u072-a"
      role={r ?? undefined}
      style={{ "--c": COLOR[kind] } as React.CSSProperties}
    >
      <span className="u072-ic" aria-hidden="true">
        <svg viewBox="0 0 16 16">
          <path d={ICON[kind]} />
        </svg>
      </span>
      <div className="u072-tx">
        <b>{children}</b>
      </div>
    </div>
  );
}
