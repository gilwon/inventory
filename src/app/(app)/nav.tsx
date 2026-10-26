"use client";
// 메뉴 정의(NAV_ITEMS)와 PC 사이드 레일, 모바일 하단 탭 연결

import { logout } from "@/app/login/actions";
import { SideRail, type NavItem } from "@/components/lucian/side-rail";
import { TabBar } from "@/components/lucian/tab-bar";

// 메뉴는 이 배열 하나로 정의한다. 항목을 추가하면 레일과 탭에 모두 반영된다.
// 모바일 탭은 앞 4개만 보이고 나머지는 더보기(로그아웃 포함)로 들어간다.
export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "대시보드",
    icon: <path d="M4 11l8-6.5 8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" />,
  },
  {
    href: "/items",
    label: "품목",
    icon: (
      <>
        <rect x="4" y="4" width="7" height="7" rx="2" />
        <rect x="13" y="4" width="7" height="7" rx="2" />
        <rect x="4" y="13" width="7" height="7" rx="2" />
        <rect x="13" y="13" width="7" height="7" rx="2" />
      </>
    ),
  },
  {
    href: "/locations",
    label: "위치",
    icon: (
      <>
        <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
        <circle cx="12" cy="10" r="2.3" />
      </>
    ),
  },
  {
    href: "/move",
    label: "입출고",
    icon: <path d="M7 4v14M7 4L4 7M7 4l3 3M17 20V6M17 20l-3-3M17 20l3-3" />,
  },
  {
    href: "/history",
    label: "이력",
    icon: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </>
    ),
  },
  {
    href: "/import-export",
    label: "가져오기/내보내기",
    icon: <path d="M12 4v11M12 15l-4-4M12 15l4-4M5 19.5h14" />,
  },
];

// PC 화면(md 이상) 좌측 사이드 레일
export function SideNav() {
  return <SideRail items={NAV_ITEMS} logoutAction={logout} />;
}

// 모바일 화면(md 미만) 하단 탭 바
export function BottomNav() {
  return <TabBar items={NAV_ITEMS} logoutAction={logout} />;
}
