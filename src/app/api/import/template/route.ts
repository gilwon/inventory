// 가져오기 양식(.xlsx) 내려받기
import { getRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buildTemplate } from "@/lib/excel/build";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });
  if ((await getRole()) !== "admin")
    return Response.json({ error: "관리자만 사용할 수 있습니다" }, { status: 403 });

  const body = await buildTemplate();
  return new Response(body as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent("재고_가져오기_양식.xlsx")}`,
      "Cache-Control": "no-store",
    },
  });
}
