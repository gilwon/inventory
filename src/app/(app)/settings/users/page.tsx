// 사용자 관리 화면 (관리자 전용, 사용자 목록·권한 변경·계정 만들기)
import { Suspense } from "react";
import { getRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminOnlyNotice } from "../../admin-only-notice";
import { badgeCls, cardCls, errCls } from "../../items/common";
import { RoleSelect } from "./role-select";
import { UserForm } from "./user-form";

async function UsersContent() {
  if ((await getRole()) !== "admin") return <AdminOnlyNotice />;

  const supabase = await createClient();
  const [{ data: userData }, { data, error }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("profiles")
      .select("id, display_name, email, role")
      .order("display_name", { nullsFirst: false }),
  ]);
  const me = userData.user?.id;
  const users = data ?? [];
  const nameOf = (u: (typeof users)[number]) => u.display_name || u.email || "이름 없음";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-bold">사용자 관리</h1>

      <section aria-labelledby="list-h" className="space-y-3">
        <h2 id="list-h" className="font-bold">
          사용자 목록
        </h2>
        {error && (
          <p role="alert" className={errCls}>
            사용자를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </p>
        )}

        {/* 모바일은 카드 */}
        <ul className="space-y-2 md:hidden">
          {users.map((u) => (
            <li key={u.id} className={`${cardCls} space-y-3`}>
              <div className="min-w-0">
                <p className="break-words font-medium">
                  {nameOf(u)}
                  {u.id === me && <span className={`${badgeCls} ml-2`}>나</span>}
                </p>
                <p className="break-all text-sm text-ink-2">{u.email ?? "-"}</p>
              </div>
              <RoleSelect userId={u.id} role={u.role} idPrefix="m" name={nameOf(u)} />
            </li>
          ))}
        </ul>

        {/* md 이상은 표 */}
        <div className={`${cardCls} hidden overflow-x-auto md:block`}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="py-2 pr-3 font-medium">표시 이름</th>
                <th scope="col" className="py-2 pr-3 font-medium">이메일</th>
                <th scope="col" className="py-2 font-medium">권한</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => (
                <tr key={u.id} className="align-top">
                  <td className="break-words py-3 pr-3 font-medium">
                    {nameOf(u)}
                    {u.id === me && <span className={`${badgeCls} ml-2`}>나</span>}
                  </td>
                  <td className="break-all py-3 pr-3 text-ink-2">{u.email ?? "-"}</td>
                  <td className="py-3">
                    <RoleSelect userId={u.id} role={u.role} idPrefix="d" name={nameOf(u)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="new-h" className={`${cardCls} space-y-3`}>
        <h2 id="new-h" className="font-bold">
          계정 만들기
        </h2>
        <UserForm />
      </section>
    </div>
  );
}

// 데이터 조회는 Suspense 안에서 해서 화면 이동이 막히지 않게 한다.
export default function UsersPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-2">불러오는 중...</p>}>
      <UsersContent />
    </Suspense>
  );
}
