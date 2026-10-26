// Lucian UX/UI Prompt #085 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#085
"use client";
// 모바일(md 미만)에서 페이지 맨 위를 아래로 당기면 서버 데이터를 다시 불러오는 당겨서 새로고침. main 영역을 감싼다

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { isPullReady, pullDistance, PULL_READY } from "@/lib/pull";
import "./pull-to-refresh.css";

// 이 안에서 시작한 터치는 당기지 않는다.
const SKIP = 'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[data-no-ptr],dialog';

export function PullToRefresh({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLElement>(null);
  const msgRef = useRef<HTMLSpanElement>(null);
  const busyRef = useRef(false);
  const pendingRef = useRef(false);
  const tryFinishRef = useRef<() => void>(() => {});

  useEffect(() => {
    const root = rootRef.current;
    const body = bodyRef.current;
    const msg = msgRef.current;
    if (!root || !body || !msg) return;
    const mq = window.matchMedia("(min-width: 768px)");
    const rmq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };
    const minMs = () => (rmq.matches ? 300 : 600);

    let sx = 0;
    let sy = 0;
    let pull = 0;
    let tracking = false;
    let pulling = false;
    let startedAt = 0;

    // 당김 값을 CSS 변수·준비 상태·문구·본문 위치에 반영한다. 0이면 transform 을 비운다.
    function set(p: number) {
      pull = p;
      root!.style.setProperty("--pull", p.toFixed(1));
      root!.classList.toggle("is-ready", isPullReady(p));
      msg!.textContent = root!.classList.contains("is-load")
        ? "데이터를 불러오는 중"
        : isPullReady(p)
          ? "놓으면 새로고침"
          : "아래로 당겨 새로고침";
      body!.style.transform = p > 0 ? `translateY(${(p * 1.3).toFixed(1)}px)` : "";
    }

    function finish() {
      if (!root!.classList.contains("is-load")) return;
      root!.classList.remove("is-load");
      set(0);
      setStatus("새로고침했습니다");
      later(() => {
        busyRef.current = false;
      }, rmq.matches ? 0 : 500);
    }

    // 서버 요청이 끝났고 최소 로딩 시간이 지났을 때만 끝낸다.
    function tryFinish() {
      if (!busyRef.current || pendingRef.current) return;
      const left = minMs() - (Date.now() - startedAt);
      if (left > 0) later(tryFinish, left);
      else finish();
    }
    tryFinishRef.current = tryFinish;

    function refresh() {
      if (busyRef.current) return;
      busyRef.current = true;
      startedAt = Date.now();
      root!.classList.add("rel", "is-load");
      set(PULL_READY);
      setStatus("새로고침 중");
      startTransition(() => router.refresh());
      later(tryFinish, minMs());
      // 요청이 끝났다는 신호가 오지 않아도 로딩 표시가 남지 않게 한다.
      later(finish, 10000);
    }

    function release() {
      tracking = false;
      pulling = false;
      root!.classList.add("rel");
      set(0);
    }

    function onStart(e: TouchEvent) {
      tracking = false;
      pulling = false;
      if (busyRef.current || e.touches.length !== 1) return;
      if (window.scrollY > 0 || document.body.style.overflow === "hidden") return;
      if ((e.target as Element | null)?.closest?.(SKIP)) return;
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      tracking = true;
      pull = 0;
      root!.classList.remove("rel");
    }

    function onMove(e: TouchEvent) {
      if (!tracking) return;
      if (e.touches.length > 1 || window.scrollY > 0) {
        if (pulling) release();
        else tracking = false;
        return;
      }
      const dx = e.touches[0].clientX - sx;
      const dy = e.touches[0].clientY - sy;
      if (!pulling) {
        if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
        // 위로 가거나 가로 움직임이 더 크면 이번 터치는 당기지 않는다.
        if (dy <= 0 || Math.abs(dx) > Math.abs(dy)) {
          tracking = false;
          return;
        }
        pulling = true;
      }
      set(pullDistance(dy));
      // 당기는 중에만 브라우저 기본 오버스크롤을 막는다.
      if (pull > 0 && e.cancelable) e.preventDefault();
    }

    function onEnd(e: TouchEvent) {
      if (!tracking) return;
      const wasPulling = pulling;
      tracking = false;
      pulling = false;
      if (!wasPulling) return;
      if (e.type === "touchend" && isPullReady(pull)) refresh();
      else release();
    }

    function attach() {
      window.addEventListener("touchstart", onStart, { passive: true });
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend", onEnd);
      window.addEventListener("touchcancel", onEnd);
    }
    function detach() {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    }
    // md 이상에서는 리스너를 걸지 않는다. 미디어쿼리가 바뀌면 다시 맞춘다.
    function sync() {
      if (mq.matches) {
        detach();
        if (!busyRef.current) release();
      } else attach();
    }
    mq.addEventListener("change", sync);
    sync();
    set(0);

    return () => {
      detach();
      mq.removeEventListener("change", sync);
      timers.forEach((id) => window.clearTimeout(id));
      timers.clear();
      tryFinishRef.current = () => {};
      busyRef.current = false;
      root.classList.remove("is-load", "rel");
      body.style.transform = "";
    };
  }, [router, startTransition]);

  // router.refresh() 가 끝나면(pending 해제) 로딩을 마무리한다.
  useEffect(() => {
    pendingRef.current = isPending;
    if (!isPending) tryFinishRef.current();
  }, [isPending]);

  return (
    <div ref={rootRef} className="ux u085">
      <span className="u085-ind" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8" pathLength="100" />
          <path d="M12 1.6l3.4 2.6L12 6.8z" />
        </svg>
      </span>
      <span ref={msgRef} className="u085-msg" aria-hidden="true" />
      <span className="sr-only" role="status" aria-live="polite">
        {status}
      </span>
      <main ref={bodyRef} className={`u085-body ${className ?? ""}`}>
        {children}
      </main>
    </div>
  );
}
