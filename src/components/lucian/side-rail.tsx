// Lucian UX/UI Prompt #040 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#040
"use client";
// 데스크톱(md 이상) 펼쳐지는 사이드 레일 내비게이션

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import "./side-rail.css";

export type NavItem = { href: string; label: string; icon: ReactNode };

// 현재 경로가 해당 메뉴인지 판단한다. 대시보드("/")만 정확히 일치해야 한다.
export function isActive(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export const LOGOUT_ICON = (
  <path d="M14 4.5H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h8M10 12h10M17 8.5L20.5 12 17 15.5" />
);

export function SideRail({
  items,
  logoutAction,
}: {
  items: NavItem[];
  logoutAction: () => void | Promise<void>;
}) {
  const pathname = usePathname();
  // 처음부터 펼친 상태로 보여 준다.
  const [wide, setWide] = useState(true);
  const activeIdx = items.findIndex((it) => isActive(pathname, it.href));

  // 위아래 화살표로 메뉴 항목(로그아웃 포함)을 오간다.
  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    const d = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    const els = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>(".u040-it"),
    );
    const cur = els.indexOf(document.activeElement as HTMLElement);
    if (cur < 0) return;
    e.preventDefault();
    els[(cur + d + els.length) % els.length].focus();
  }

  return (
    <div className={`ux u040${wide ? " is-wide" : ""}`}>
      <nav className="u040-rail" aria-label="주 메뉴" onKeyDown={onKeyDown}>
        <div className="u040-top">
          <span className="u040-logo" aria-hidden="true" />
          <span className="u040-name">재고 관리</span>
        </div>
        <button
          className="u040-tog"
          type="button"
          aria-expanded={wide}
          aria-label={wide ? "메뉴 접기" : "메뉴 펼치기"}
          onClick={() => setWide((v) => !v)}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M6 3.5L10.5 8 6 12.5" />
          </svg>
        </button>
        <ul className="u040-nav">
          <li
            className="u040-hl"
            role="presentation"
            style={{ "--k": Math.max(activeIdx, 0), opacity: activeIdx < 0 ? 0 : 1 } as CSSProperties}
          />
          {items.map((it, i) => (
            <li key={it.href}>
              <Link
                className="u040-it"
                href={it.href}
                title={it.label}
                style={{ "--i": i } as CSSProperties}
                aria-current={i === activeIdx ? "page" : undefined}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">{it.icon}</svg>
                <span>{it.label}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="u040-foot">
          <form action={logoutAction}>
            <button
              className="u040-it"
              type="submit"
              title="로그아웃"
              style={{ "--i": items.length } as CSSProperties}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">{LOGOUT_ICON}</svg>
              <span>로그아웃</span>
            </button>
          </form>
        </div>
      </nav>
    </div>
  );
}
