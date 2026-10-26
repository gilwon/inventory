// 업로드한 엑셀을 읽어 행별 검증 결과를 돌려주는 미리보기 API
import { createClient } from "@/lib/supabase/server";
import { UploadError, loadSnapshot, readUpload } from "@/lib/excel/parse";
import { validateWorkbook } from "@/lib/excel/validate";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });

  try {
    const parsed = await readUpload(request);
    const snapshot = await loadSnapshot(supabase);
    const { rows, hasError } = validateWorkbook(parsed, snapshot);
    return Response.json({ rows, hasError });
  } catch (e) {
    if (e instanceof UploadError) {
      return Response.json({ error: e.message }, { status: e.status });
    }
    return Response.json({ error: "미리보기를 만들지 못했습니다" }, { status: 500 });
  }
}
