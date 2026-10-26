// Lucian UX/UI Prompt #041 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#041
"use client";
// 모바일(md 미만) 하단 탭 바. tabHrefs 로 고른 메뉴 + 더보기(나머지와 로그아웃)

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { splitTabs } from "@/lib/tabs";
import { isActive, LOGOUT_ICON, type NavItem } from "./side-rail";
import "./tab-bar.css";

const MORE_ICON = (
  <>
    <circle cx="5.5" cy="12" r="1.7" fill="currentColor" />
    <circle cx="12" cy="12" r="1.7" fill="currentColor" />
    <circle cx="18.5" cy="12" r="1.7" fill="currentColor" />
  </>
);

export function TabBar({
  items,
  tabHrefs,
  logoutAction,
}: {
  items: NavItem[];
  tabHrefs: readonly string[];
  logoutAction: () => void | Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLUListElement>(null);
  // 지금 x 위치(스프링 상태). 처음 마운트 때만 null이다.
  const xRef = useRef<number | null>(null);
  const vRef = useRef(0);

  const { tabs, more } = splitTabs(items, tabHrefs);
  const moreIdx = tabs.length;
  // 현재 경로가 탭이면 그 번호, 더보기 안의 메뉴이면 더보기 번호, 아니면 -1
  const activeIdx = tabs.some((t) => isActive(pathname, t.href))
    ? tabs.findIndex((t) => isActive(pathname, t.href))
    : more.some((m) => isActive(pathname, m.href))
      ? moreIdx
      : -1;

  // 파인 홈과 원은 같은 x 값을 쓰고, 그 값을 스프링으로 움직여 함께 미끄러지게 한다.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || activeIdx < 0) return;
    const tabEls = Array.from(root.querySelectorAll<HTMLElement>(".u041-tab"));
    const rmQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    const center = (t: HTMLElement) =>
      (t.parentElement as HTMLElement).offsetLeft + t.offsetWidth / 2;
    const setX = (x: number) => root.style.setProperty("--x", `${x.toFixed(2)}px`);
    let target = center(tabEls[activeIdx]);

    function step() {
      const x0 = xRef.current ?? target;
      const a = (target - x0) * 0.16 - vRef.current * 0.42;
      vRef.current += a;
      const x = x0 + vRef.current;
      xRef.current = x;
      setX(x);
      if (Math.abs(target - x) > 0.3 || Math.abs(vRef.current) > 0.3) {
        raf = requestAnimationFrame(step);
      } else {
        xRef.current = target;
        vRef.current = 0;
        setX(target);
        raf = 0;
      }
    }
    function snap() {
      cancelAnimationFrame(raf);
      raf = 0;
      xRef.current = target;
      vRef.current = 0;
      setX(target);
    }

    if (xRef.current === null || rmQuery.matches) snap();
    else raf = requestAnimationFrame(step);

    // 화면 폭이 바뀌면 탭 중심이 달라지므로 즉시 다시 맞춘다.
    const onResize = () => {
      target = center(tabEls[activeIdx]);
      snap();
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [activeIdx, tabs.length]);

  // 더보기가 열려 있는 동안 Esc로 닫고, 바깥을 누르면 닫는다.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        moreRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !moreRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  // 탭 줄에서는 좌우 화살표로 탭 사이를 오간다.
  function onTabsKeyDown(e: KeyboardEvent<HTMLUListElement>) {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    const els = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>(".u041-tab"),
    );
    const cur = els.indexOf(document.activeElement as HTMLElement);
    if (cur < 0) return;
    e.preventDefault();
    els[(cur + d + els.length) % els.length].focus();
  }

  // 더보기 패널에서는 위아래 화살표로 항목을 오간다.
  function onPanelKeyDown(e: KeyboardEvent<HTMLUListElement>) {
    const d = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    const els = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>(".u041-mi"),
    );
    const cur = els.indexOf(document.activeElement as HTMLElement);
    e.preventDefault();
    els[(cur + d + els.length) % els.length].focus();
  }

  return (
    <div ref={rootRef} className={`ux u041${activeIdx >= 0 ? " has-sel" : ""}`}>
      <span className="u041-shadow" aria-hidden="true" />
      <div className="u041-bar" aria-hidden="true" />
      <span className="u041-bub" aria-hidden="true" />
      {open && (
        <ul
          ref={panelRef}
          id="u041-more-panel"
          className="u041-more"
          aria-label="더보기"
          onKeyDown={onPanelKeyDown}
        >
          {more.map((m) => (
            <li key={m.href}>
              <Link
                className="u041-mi"
                href={m.href}
                aria-current={isActive(pathname, m.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">{m.icon}</svg>
                {m.label}
              </Link>
            </li>
          ))}
          <li>
            <form action={logoutAction}>
              <button className="u041-mi" type="submit">
                <svg viewBox="0 0 24 24" aria-hidden="true">{LOGOUT_ICON}</svg>
                로그아웃
              </button>
            </form>
          </li>
        </ul>
      )}
      <nav className="u041-nav" aria-label="하단 메뉴" style={{ display: "contents" }}>
        <ul className="u041-tabs" onKeyDown={onTabsKeyDown}>
          {tabs.map((t, i) => (
            <li key={t.href}>
              <Link
                className="u041-tab"
                href={t.href}
                title={t.label}
                data-sel={i === activeIdx ? "" : undefined}
                aria-current={i === activeIdx ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                <span className="u041-ic" aria-hidden="true">
                  <svg viewBox="0 0 24 24">{t.icon}</svg>
                </span>
                <span className="u041-lab">{t.label}</span>
              </Link>
            </li>
          ))}
          <li>
            <button
              ref={moreRef}
              className="u041-tab"
              type="button"
              title="더보기"
              aria-expanded={open}
              aria-controls="u041-more-panel"
              data-sel={moreIdx === activeIdx ? "" : undefined}
              onClick={() => setOpen((v) => !v)}
            >
              <span className="u041-ic" aria-hidden="true">
                <svg viewBox="0 0 24 24">{MORE_ICON}</svg>
              </span>
              <span className="u041-lab">더보기</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
