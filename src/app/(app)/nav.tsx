"use client";
// 모바일 하단 탭과 PC 좌측 내비게이션

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const MAIN = [
  { href: "/", label: "대시보드" },
  { href: "/items", label: "품목" },
  { href: "/locations", label: "위치" },
  { href: "/move", label: "입출고" },
  { href: "/history", label: "이력" },
];
const MORE = { href: "/import-export", label: "가져오기/내보내기" };

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

const focus =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

// PC 화면(md 이상) 좌측 내비
export function SideNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="주 메뉴" className="flex flex-col gap-1">
      {[...MAIN, MORE].map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={isActive(pathname, l.href) ? "page" : undefined}
          className={`rounded-xl px-3 py-2 text-sm font-medium text-ink-2 hover:bg-surface-2 aria-[current=page]:bg-accent-soft aria-[current=page]:text-ink ${focus}`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

// 모바일 화면(md 미만) 하단 탭
export function BottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const tab = `flex min-h-14 flex-1 items-center justify-center px-1 text-xs font-medium text-ink-2 aria-[current=page]:text-accent aria-[current=page]:underline ${focus}`;

  return (
    <nav
      aria-label="주 메뉴"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface md:hidden"
    >
      {open && (
        <Link
          href={MORE.href}
          onClick={() => setOpen(false)}
          aria-current={isActive(pathname, MORE.href) ? "page" : undefined}
          className={`block border-b border-line px-4 py-3 text-sm font-medium text-ink ${focus}`}
        >
          {MORE.label}
        </Link>
      )}
      <div className="flex">
        {MAIN.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={() => setOpen(false)}
            aria-current={isActive(pathname, l.href) ? "page" : undefined}
            className={tab}
          >
            {l.label}
          </Link>
        ))}
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={tab}
        >
          더보기
        </button>
      </div>
    </nav>
  );
}
