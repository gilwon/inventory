// 로그인 확인 후 하단 탭/좌측 레일 내비게이션(로그아웃 포함)을 두르는 레이아웃
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PullToRefresh } from "@/components/lucian/pull-to-refresh";
import { ListSkeleton } from "@/components/lucian/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { isDemo } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";
import { exitDemo } from "../login/actions";
import { focusRing } from "./items/common";
import { BottomNav, MobileMenu, SideNav } from "./nav";

// proxy.ts 가 1차로 막고, 여기서 getUser 로 한 번 더 확인한다.
async function AuthGate({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return children;
}

// 데모 쿠키가 있을 때만 보이는 안내 띠. cookies 는 요청 시점 API 라 Suspense 안에서 읽는다.
async function DemoBanner() {
  if (!(await isDemo())) return null;
  return (
    <div
      role="status"
      className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm"
    >
      <span>데모 모드입니다. 입력한 내용은 저장되지 않습니다.</span>
      <form action={exitDemo}>
        <button
          type="submit"
          className={`min-h-11 rounded-lg border border-line px-3 font-bold ${focusRing}`}
        >
          데모 종료
        </button>
      </form>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="hidden shrink-0 md:block">
        <Suspense fallback={null}>
          <SideNav />
        </Suspense>
      </aside>

      {/* 모바일 헤더는 스크롤해도 위에 고정한다. 햄버거 시트(z-50)가 헤더 안에서 하단 탭 바 위에 뜨도록 z-30을 준다. */}
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-surface px-4 py-2 md:hidden">
        <Suspense fallback={<span className="size-11 shrink-0" aria-hidden="true" />}>
          <MobileMenu />
        </Suspense>
        <div className="min-w-0 flex-1">
          <Link
            href="/"
            className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-lg text-2xl font-bold leading-tight ${focusRing}`}
          >
            재고 관리
          </Link>
        </div>
        <ThemeToggle />
      </header>

      <PullToRefresh className="min-w-0 flex-1 p-4 pb-32 md:p-6 md:pb-6">
        <div className="mb-2 hidden justify-end md:flex">
          <ThemeToggle />
        </div>
        <Suspense fallback={null}>
          <DemoBanner />
        </Suspense>
        <Suspense fallback={<ListSkeleton />}>
          <AuthGate>{children}</AuthGate>
        </Suspense>
      </PullToRefresh>

      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </div>
  );
}
