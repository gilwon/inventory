// 관리자가 팀원 계정을 만드는 Edge Function (Deno)
//
// 동작
// 1. POST 만 받는다. OPTIONS 는 CORS 사전 요청이므로 허용하고 그 외 메서드는 405 로 거절한다.
// 2. Authorization 헤더의 JWT 로 호출자를 확인한다 (없거나 실패하면 401).
// 3. 서비스 클라이언트로 profiles 에서 호출자의 role 을 읽어 관리자가 아니면 403 으로 거절한다.
// 4. 본문(email, password, display_name, role)을 검증하고 auth.admin.createUser 로 계정을 만든다.
// 5. 새 프로필의 role 이 요청과 다르면 갱신한다 (이미 관리자가 있으므로 새 사용자는 worker 로 만들어진다).
//
// 호출 방법 (앱은 서버 액션에서 supabase.functions.invoke 로 호출한다)
//   supabase.functions.invoke("create-user", {
//     body: { email, password, display_name, role: "worker" },
//   })
//   성공 200 {ok:true, user_id}, 실패 {error:"한국어 문구"}
//
// 서비스 롤 키는 이 함수 환경에서만 읽는다. 응답과 로그에 키, 비밀번호, 오류 원문을 남기지 않는다.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// JSON 응답을 만든다.
function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "허용되지 않는 요청입니다" }, 405);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) {
    return json({ error: "계정을 만들지 못했습니다" }, 500);
  }

  // 호출자 확인
  const authorization = req.headers.get("Authorization");
  if (!authorization) {
    return json({ error: "로그인이 필요합니다" }, 401);
  }
  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: userData, error: userError } = await caller.auth.getUser();
  if (userError || !userData.user) {
    return json({ error: "로그인이 필요합니다" }, 401);
  }

  // 호출자의 권한 확인 (서비스 클라이언트는 RLS 를 우회하므로 이 함수 안에서만 쓴다)
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (profileError) {
    return json({ error: "계정을 만들지 못했습니다" }, 500);
  }
  if (profile?.role !== "admin") {
    return json({ error: "관리자만 만들 수 있습니다" }, 403);
  }

  // 본문 검증
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "요청 형식이 올바르지 않습니다" }, 400);
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return json({ error: "요청 형식이 올바르지 않습니다" }, 400);
  }
  const { email: rawEmail, password, display_name: rawName, role } = body as Record<string, unknown>;

  const email = typeof rawEmail === "string" ? rawEmail.trim() : "";
  if (email.length === 0 || email.length > 254 || !EMAIL_RE.test(email)) {
    return json({ error: "이메일 형식이 올바르지 않습니다" }, 400);
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 72) {
    return json({ error: "비밀번호는 8자 이상 72자 이하여야 합니다" }, 400);
  }
  const displayName = typeof rawName === "string" ? rawName.trim() : "";
  if (displayName.length < 1 || displayName.length > 50) {
    return json({ error: "표시 이름은 1자 이상 50자 이하여야 합니다" }, 400);
  }
  if (role !== "admin" && role !== "worker") {
    return json({ error: "권한은 관리자 또는 작업자여야 합니다" }, 400);
  }

  // 계정 생성 (프로필은 auth.users 트리거가 만든다)
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (createError || !created.user) {
    if (createError?.code === "email_exists" || createError?.code === "user_already_exists") {
      return json({ error: "이미 있는 이메일입니다" }, 409);
    }
    return json({ error: "계정을 만들지 못했습니다" }, 500);
  }

  // 트리거는 새 사용자를 worker 로 만들므로 요청이 admin 일 때만 갱신한다.
  if (role !== "worker") {
    const { error: roleError } = await admin
      .from("profiles")
      .update({ role })
      .eq("id", created.user.id);
    if (roleError) {
      return json({ error: "계정은 만들었지만 권한을 바꾸지 못했습니다. 사용자 목록에서 권한을 바꿔 주세요" }, 500);
    }
  }

  return json({ ok: true, user_id: created.user.id });
});
