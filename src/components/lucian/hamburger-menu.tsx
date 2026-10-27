"use client";
// 모바일(md 미만) 헤더 햄버거 버튼과 아래로 펼쳐지는 전체 메뉴. Lucian UX/UI #286 이식(하위 메뉴 이동은 항목에 하위가 없어 제외)
// <!-- Lucian UX/UI Prompt #286 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#286 -->

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
  const panelRef = useRef<HTMLElement>(null);

  // 닫고 포커스를 햄버거로 돌린다.
  function close() {
    setOpenedAt(null);
    btnRef.current?.focus();
  }

  // 열려 있는 동안만 스크롤 잠금, Esc, Tab 가두기, md 이상 전환 시 닫기를 건다.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const btn = btnRef.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpenedAt(null);
        btn?.focus();
        return;
      }
      if (e.key !== "Tab" || !panel || !btn) return;
      // 버튼(X)도 순환에 넣어 키보드로 닫을 수 있게 한다.
      const els = [btn, ...Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))];
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
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? close() : setOpenedAt(pathname))}
      >
        <span aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </button>
      <nav ref={panelRef} id={panelId} className="hmenu-panel" aria-label="전체 메뉴" inert={!open}>
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
          <button className="hmenu-it" type="submit" style={{ "--i": items.length } as CSSProperties}>
            <svg viewBox="0 0 24 24" aria-hidden="true">{LOGOUT_ICON}</svg>
            <span>로그아웃</span>
          </button>
        </form>
      </nav>
    </div>
  );
}
