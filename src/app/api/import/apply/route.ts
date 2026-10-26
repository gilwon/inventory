// 같은 파일을 다시 읽고 검증한 뒤 import_apply 로 가져오기를 확정하는 API
import { getRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { UploadError, loadSnapshot, readUpload } from "@/lib/excel/parse";
import { validateWorkbook } from "@/lib/excel/validate";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });
  if ((await getRole()) !== "admin")
    return Response.json({ error: "관리자만 사용할 수 있습니다" }, { status: 403 });

  try {
    // 클라이언트의 검증 결과는 받지 않고 서버에서 다시 검증한다.
    const parsed = await readUpload(request);
    const snapshot = await loadSnapshot(supabase);
    const { rows, hasError, itemsUpdated, payload } = validateWorkbook(parsed, snapshot);
    if (hasError || !payload) {
      return Response.json(
        { error: "오류가 있어 가져올 수 없습니다. 파일을 고쳐 다시 올리세요", rows, itemsUpdated },
        { status: 422 },
      );
    }

    const { data, error } = await supabase.rpc("import_apply", { p_payload: payload });
    if (error) {
      // DB 오류 메시지는 한국어 안내일 때만 그대로 보여 준다.
      const message = /[가-힣]/.test(error.message)
        ? error.message
        : "가져오기에 실패했습니다. 아무것도 반영되지 않았습니다";
      return Response.json({ error: message }, { status: 400 });
    }
    return Response.json({ result: data });
  } catch (e) {
    if (e instanceof UploadError) {
      return Response.json({ error: e.message }, { status: e.status });
    }
    return Response.json({ error: "가져오기에 실패했습니다" }, { status: 500 });
  }
}
