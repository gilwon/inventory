// 로그인 확인 후 하단 탭/좌측 레일 내비게이션(로그아웃 포함)을 두르는 레이아웃
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ListSkeleton } from "@/components/lucian/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/server";
import { BottomNav, SideNav } from "./nav";

// proxy.ts 가 1차로 막고, 여기서 getUser 로 한 번 더 확인한다.
async function AuthGate({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return children;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="hidden shrink-0 md:block">
        <Suspense fallback={null}>
          <SideNav />
        </Suspense>
      </aside>

      <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-2 md:hidden">
        <p className="font-bold">재고 관리</p>
        <ThemeToggle />
      </header>

      <main className="min-w-0 flex-1 p-4 pb-32 md:p-6 md:pb-6">
        <div className="mb-2 hidden justify-end md:flex">
          <ThemeToggle />
        </div>
        <Suspense fallback={<ListSkeleton />}>
          <AuthGate>{children}</AuthGate>
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </div>
  );
}
