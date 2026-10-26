"use client";
// 모바일(md 미만) 헤더 햄버거 버튼과 전체 메뉴 시트. --ux-* 토큰으로 직접 만들었다(Lucian 원본 이식 아님)

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { isActive, LOGOUT_ICON, type NavItem } from "./side-rail";
import "./hamburger-menu.css";

const FOCUSABLE = "a[href],button:not([disabled])";

export function HamburgerMenu({
  items,
  logoutAction,
}: {
  items: NavItem[];
  logoutAction: () => void | Promise<void>;
}) {
  const pathname = usePathname();
  // 열린 시점의 경로를 저장한다. 경로가 바뀌면 자동으로 닫힌 것으로 계산된다.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;
  const panelId = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 닫고 포커스를 햄버거로 돌린다.
  function close() {
    setOpenedAt(null);
    btnRef.current?.focus();
  }

  // 열려 있는 동안만 스크롤 잠금, Esc, Tab 가두기, md 이상 전환 시 닫기를 건다.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpenedAt(null);
        btnRef.current?.focus();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const els = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!els.length) return;
      const cur = els.indexOf(document.activeElement as HTMLElement);
      const next = cur < 0 ? 0 : (cur + (e.shiftKey ? -1 : 1) + els.length) % els.length;
      e.preventDefault();
      els[next].focus();
    };
    const mq = window.matchMedia("(min-width: 768px)");
    const onMq = () => {
      if (mq.matches) setOpenedAt(null);
    };
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
    };
  }, [open]);

  return (
    <div className={`ux hmenu${open ? " is-open" : ""}`}>
      <button
        ref={btnRef}
        className="hmenu-btn"
        type="button"
        aria-label="메뉴 열기"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpenedAt(pathname)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      <div className="hmenu-layer" inert={!open}>
        <div className="hmenu-scrim" onClick={close} aria-hidden="true" />
        <div ref={panelRef} id={panelId} className="hmenu-panel" role="dialog" aria-modal="true" aria-label="전체 메뉴">
          <div className="hmenu-head">
            <span className="hmenu-title">메뉴</span>
            <button className="hmenu-x" type="button" aria-label="메뉴 닫기" onClick={close}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <ul className="hmenu-list">
            {items.map((it, i) => (
              <li key={it.href}>
                <Link
                  className="hmenu-it"
                  href={it.href}
                  style={{ "--i": i } as CSSProperties}
                  aria-current={isActive(pathname, it.href) ? "page" : undefined}
                  onClick={close}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">{it.icon}</svg>
                  <span>{it.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <form className="hmenu-foot" action={logoutAction}>
            <button className="hmenu-it" type="submit">
              <svg viewBox="0 0 24 24" aria-hidden="true">{LOGOUT_ICON}</svg>
              <span>로그아웃</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
