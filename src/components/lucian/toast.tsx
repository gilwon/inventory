"use client";
// Lucian UX/UI Prompt #070 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#070
// 겹쳐 쌓이는 토스트. useToast 훅으로 알림을 띄우고 ToastHost 가 그린다(앱 전역 provider 없이 화면 안에서 쓴다).

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import "./toast.css";

export type ToastKind = "ok" | "err" | "info";
type ToastItem = {
  id: number;
  kind: ToastKind;
  title: string;
  detail?: string;
  duration: number;
  leaving: boolean;
  dir?: 1 | -1;
};

const LEAVE_MS = 450;
const COLOR: Record<ToastKind, string> = {
  ok: "var(--ux-mint)",
  err: "var(--ux-danger)",
  info: "var(--ux-accent)",
};
// 라이브러리 아이콘 경로(18x18)
const ICON: Record<ToastKind, string> = {
  ok: "M4 9.4l3.2 3.2L14 5.6",
  err: "M9 5v5M9 13h.01",
  info: "M3.5 4.5h11v7h-6l-3 2.5v-2.5h-2z",
};

export type ToastApi = {
  items: ToastItem[];
  show: (kind: ToastKind, title: string, detail?: string) => void;
  dismiss: (id: number, dir?: 1 | -1) => void;
};

export function useToast(): ToastApi {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const timers = useRef(new Set<number>());

  const dismiss = useCallback((id: number, dir?: 1 | -1) => {
    setItems((l) =>
      l.map((t) => (t.id === id ? { ...t, leaving: true, dir } : t)),
    );
    const h = window.setTimeout(() => {
      timers.current.delete(h);
      setItems((l) => l.filter((t) => t.id !== id));
    }, LEAVE_MS);
    timers.current.add(h);
  }, []);

  const show = useCallback(
    (kind: ToastKind, title: string, detail?: string) => {
      const id = ++seq.current;
      // 오류는 읽을 시간이 더 필요해 오래 둔다.
      const duration = kind === "err" ? 8000 : 4500;
      setItems((l) => [
        { id, kind, title, detail, duration, leaving: false },
        ...l,
      ]);
    },
    [],
  );

  useEffect(() => {
    const set = timers.current;
    return () => set.forEach((h) => clearTimeout(h));
  }, []);

  return { items, show, dismiss };
}

export function ToastHost({ toast }: { toast: ToastApi }) {
  const { items, dismiss } = toast;
  const [open, setOpen] = useState(false);
  const zoneRef = useRef<HTMLDivElement>(null);
  const els = useRef(new Map<number, HTMLDivElement>());
  const lefts = useRef(new Map<number, number>());
  const itemsRef = useRef(items);
  const openRef = useRef(open);
  const live = items.find((t) => !t.leaving)?.title ?? "";
  const active = items.some((t) => !t.leaving);

  useEffect(() => {
    itemsRef.current = items;
    openRef.current = open;
    // 사라진 알림의 남은 시간 기록을 정리한다.
    const ids = new Set(items.map((t) => t.id));
    lefts.current.forEach((_, id) => {
      if (!ids.has(id)) lefts.current.delete(id);
    });
  });

  // 접혀 있을 때는 뒤 알림을 작게 겹치고, 펼치면 높이만큼 위로 쌓아 목록처럼 보여 준다.
  useLayoutEffect(() => {
    let acc = 0;
    items
      .filter((t) => !t.leaving)
      .forEach((t, i) => {
        const el = els.current.get(t.id);
        if (!el) return;
        el.classList.toggle("back", !open && i > 0);
        if (open) {
          el.style.setProperty("--y", `${-acc}px`);
          el.style.setProperty("--s", "1");
          el.style.setProperty("--o", "1");
          acc += el.offsetHeight + 8;
        } else {
          el.style.setProperty("--y", `${-(i * 14)}px`);
          el.style.setProperty("--s", (1 - i * 0.06).toFixed(2));
          el.style.setProperty("--o", i > 2 ? "0" : "1");
        }
        el.style.zIndex = String(50 - i);
        el.inert = !open && i > 0;
      });
  }, [items, open]);

  // 가장 새 알림만 남은 시간이 줄고, 펼쳐 둔 동안은 줄지 않는다.
  useEffect(() => {
    if (!active) return;
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(now - last, 100);
      last = now;
      if (!openRef.current) {
        const first = itemsRef.current.find((t) => !t.leaving);
        if (first) {
          const left = (lefts.current.get(first.id) ?? first.duration) - dt;
          lefts.current.set(first.id, left);
          els.current
            .get(first.id)
            ?.style.setProperty(
              "--left",
              Math.max(0, left / first.duration).toFixed(3),
            );
          if (left <= 0) {
            lefts.current.set(first.id, Infinity);
            dismiss(first.id);
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, dismiss]);

  return (
    <div className="ux u070">
      <div
        ref={zoneRef}
        className="u070-zone"
        role="region"
        aria-label="알림"
        tabIndex={-1}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") setOpen(true);
        }}
        onPointerLeave={(e) => {
          if (
            e.pointerType === "mouse" &&
            !zoneRef.current?.contains(document.activeElement)
          ) {
            setOpen(false);
          }
        }}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          if (!zoneRef.current?.contains(e.relatedTarget as Node | null))
            setOpen(false);
        }}
        onClick={(e) => {
          if (
            !(e.target as HTMLElement).closest("button") &&
            items.length > 1
          ) {
            setOpen((v) => !v);
          }
        }}
      >
        <div className="u070-live" aria-live="polite">
          {live}
        </div>
        {items.map((t) => (
          <ToastCard
            key={t.id}
            t={t}
            register={(el) => {
              if (el) els.current.set(t.id, el);
              else els.current.delete(t.id);
            }}
            dismiss={dismiss}
          />
        ))}
      </div>
    </div>
  );
}

function ToastCard({
  t,
  register,
  dismiss,
}: {
  t: ToastItem;
  register: (el: HTMLDivElement | null) => void;
  dismiss: (id: number, dir?: 1 | -1) => void;
}) {
  const drag = useRef<{ sx: number; dx: number } | null>(null);

  // 옆으로 밀어 닫기. 손가락·마우스를 놓을 때 90px 넘게 밀렸으면 그 방향으로 빠진다.
  function end(el: HTMLDivElement) {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    el.classList.remove("drag");
    if (Math.abs(d.dx) > 90) dismiss(t.id, d.dx > 0 ? 1 : -1);
    else {
      el.style.setProperty("--dx", "0px");
      el.style.setProperty("--o", "1");
    }
  }

  return (
    <div
      ref={register}
      className={`u070-t${t.leaving ? " leave" : ""}${t.leaving && t.dir ? " side" : ""}`}
      style={
        {
          "--c": COLOR[t.kind],
          ...(t.dir ? { "--dir": t.dir } : {}),
        } as React.CSSProperties
      }
      role={t.kind === "err" ? "alert" : "status"}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        drag.current = { sx: e.clientX, dx: 0 };
        e.currentTarget.setPointerCapture(e.pointerId);
        e.currentTarget.classList.add("drag");
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        d.dx = e.clientX - d.sx;
        e.currentTarget.style.setProperty("--dx", `${d.dx}px`);
        e.currentTarget.style.setProperty(
          "--o",
          String(Math.max(0.2, 1 - Math.abs(d.dx) / 260)),
        );
      }}
      onPointerUp={(e) => end(e.currentTarget)}
      onPointerCancel={(e) => end(e.currentTarget)}
    >
      <span className="u070-ic" aria-hidden="true">
        <svg viewBox="0 0 18 18">
          <path d={ICON[t.kind]} />
        </svg>
      </span>
      <span className="u070-tx">
        <b>{t.title}</b>
        {t.detail && <small>{t.detail}</small>}
      </span>
      <button
        className="u070-x"
        type="button"
        aria-label="알림 닫기"
        onClick={() => dismiss(t.id)}
      >
        <svg viewBox="0 0 14 14" aria-hidden="true">
          <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
        </svg>
      </button>
      <span className="u070-bar" aria-hidden="true" />
    </div>
  );
}
