"use client";
// 시스템·라이트·다크 화면 테마를 고르는 버튼 묶음 (선택은 localStorage 에 저장하고 기본은 시스템)

import { useSyncExternalStore } from "react";
import { focusRing } from "@/app/(app)/items/common";

type Theme = "system" | "light" | "dark";

const KEY = "theme";
const listeners = new Set<() => void>();

// 저장값을 읽는다. 없거나 저장소를 쓸 수 없으면 시스템이다.
function read(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

// 시스템이면 data-theme 을 지워 prefers-color-scheme 이 정하게 한다.
function choose(t: Theme) {
  try {
    if (t === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, t);
  } catch {
    // 저장소를 쓸 수 없어도 이번 화면에는 적용한다.
  }
  const el = document.documentElement;
  if (t === "system") el.removeAttribute("data-theme");
  else el.setAttribute("data-theme", t);
  listeners.forEach((f) => f());
}

const OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  {
    value: "system",
    label: "시스템 설정 따르기",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </>
    ),
  },
  {
    value: "light",
    label: "라이트 모드",
    icon: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
      </>
    ),
  },
  {
    value: "dark",
    label: "다크 모드",
    icon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
  },
];

export function ThemeToggle() {
  // 서버 렌더에서는 시스템으로 그리고, 저장된 값은 하이드레이션 뒤에 반영한다.
  const theme = useSyncExternalStore(subscribe, read, () => "system" as Theme);

  return (
    <div
      role="group"
      aria-label="화면 테마"
      className="inline-flex rounded-xl border border-line bg-surface-2 p-0.5"
    >
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => choose(o.value)}
          aria-pressed={theme === o.value}
          aria-label={o.label}
          title={o.label}
          className={`inline-flex size-11 items-center justify-center rounded-[10px] ${focusRing} ${
            theme === o.value ? "bg-surface text-ink shadow-card" : "text-ink-2 hover:text-ink"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {o.icon}
          </svg>
        </button>
      ))}
    </div>
  );
}
