// 현재 사용자의 권한을 읽는 서버 전용 도우미 (서버 컴포넌트와 Server Action 에서만 쓴다)
// server-only 패키지가 설치되어 있지 않아 import 로 막지 않는다. 클라이언트 컴포넌트에서 가져오지 않는다.
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "worker";

// 로그인한 사용자의 권한을 돌려준다. 로그인하지 않았거나 프로필이 없으면 null 이다.
export async function getRole(): Promise<Role | null> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  return data?.role === "admin" || data?.role === "worker" ? data.role : null;
}

// 관리자가 아니면 한국어 오류를 돌려준다. DB 가 최종 방어선이고 이 함수는 화면 분기용이다.
export async function requireAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  if ((await getRole()) === "admin") return { ok: true };
  return { ok: false, error: "관리자만 사용할 수 있습니다." };
}
