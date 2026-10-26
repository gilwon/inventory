// 세션 쿠키를 갱신하고 로그인하지 않은 요청을 /login 으로 보낸다. 데모 쿠키가 있으면 인증 없이 통과시킨다.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE } from "@/lib/demo";

export async function proxy(request: NextRequest) {
  // 데모는 목데이터만 쓰므로 Supabase 를 부르지 않는다. /login 도 막지 않아 데모에서 나갈 수 있다.
  if (request.cookies.get(DEMO_COOKIE)?.value === "1") return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // 세션 검증은 getSession 이 아니라 getUser 로 한다.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLogin = request.nextUrl.pathname === "/login";
  if (!user && !isLogin) {
    return redirectWithCookies(request, response, "/login");
  }
  if (user && isLogin) {
    return redirectWithCookies(request, response, "/");
  }
  return response;
}

// 갱신된 세션 쿠키를 리다이렉트 응답에도 실어 보낸다.
function redirectWithCookies(
  request: NextRequest,
  from: NextResponse,
  path: string,
) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest$|sw\\.js$|offline$|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
