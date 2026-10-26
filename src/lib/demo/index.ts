// 데모 모드 판별과 공통 상수 (isDemo 는 서버 컴포넌트·Server Action·라우트에서만 쓴다)
import { cookies } from "next/headers";

export const DEMO_COOKIE = "demo";
export const DEMO_MSG = "데모에서는 저장되지 않습니다.";

// 데모 쿠키가 있으면 목데이터 모드다. 쿠키는 인증이 아니며 실데이터 접근 권한을 주지 않는다.
export async function isDemo(): Promise<boolean> {
  return (await cookies()).get(DEMO_COOKIE)?.value === "1";
}
