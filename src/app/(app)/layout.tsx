// 로그인 확인 후 하단/좌측 내비게이션과 로그아웃 버튼을 두르는 레이아웃
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { logout } from "@/app/login/actions";
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

function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="rounded-xl px-3 py-2 text-sm font-medium text-ink-2 hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        로그아웃
      </button>
    </form>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="hidden w-56 shrink-0 flex-col justify-between border-r border-line bg-surface p-3 md:flex">
        <div className="space-y-4">
          <p className="px-3 pt-2 text-lg font-bold">재고 관리</p>
          <Suspense fallback={null}>
            <SideNav />
          </Suspense>
        </div>
        <LogoutButton />
      </aside>

      <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-2 md:hidden">
        <p className="font-bold">재고 관리</p>
        <LogoutButton />
      </header>

      <main className="min-w-0 flex-1 p-4 pb-24 md:p-6 md:pb-6">
        <Suspense fallback={<p className="text-sm text-ink-2">불러오는 중...</p>}>
          <AuthGate>{children}</AuthGate>
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </div>
  );
}
