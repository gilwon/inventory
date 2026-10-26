// 현재 재고와 이력을 두 시트로 내보내는 엑셀 다운로드 API
import { createClient } from "@/lib/supabase/server";
import { formatKst } from "@/lib/format";
import { buildLocationPaths } from "@/lib/location-path";
import {
  EXPORT_HISTORY_LIMIT,
  buildExport,
  type HistoryExportRow,
  type StockExportRow,
} from "@/lib/excel/build";
import { fetchAll } from "@/lib/excel/parse";

const TYPE_LABEL: Record<string, string> = {
  receive: "입고",
  issue: "출고",
  transfer_out: "이동 출고",
  transfer_in: "이동 입고",
  adjust: "조정",
  import: "가져오기",
};

const PAGE = 1000;
// 이력 페이지를 동시에 읽는 개수
const PARALLEL = 5;

type MovementRow = {
  created_at: string;
  type: string;
  delta: number;
  reason: string | null;
  reverses_id: number | null;
  created_by: string | null;
  location_id: string;
  items: { sku: string; name: string } | null;
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });

  try {
    const [locations, profiles, stockRaw, count] = await Promise.all([
      fetchAll<{ id: string; parent_id: string | null; name: string; code: string }>((f, t) =>
        supabase.from("locations").select("id, parent_id, name, code").order("id").range(f, t),
      ),
      fetchAll<{ id: string; display_name: string | null }>((f, t) =>
        supabase.from("profiles").select("id, display_name").order("id").range(f, t),
      ),
      fetchAll<{
        qty: number;
        location_id: string;
        items: { sku: string; name: string; unit: string } | null;
      }>((f, t) =>
        supabase
          .from("stock")
          .select("qty, location_id, items(sku, name, unit)")
          .gt("qty", 0)
          .order("item_id")
          .order("location_id")
          .range(f, t),
      ),
      supabase.from("movements").select("id", { count: "exact", head: true }),
    ]);
    if (count.error) throw new Error(count.error.message);

    const paths = buildLocationPaths(locations);
    const codeById = new Map(locations.map((l) => [l.id, l.code]));
    const nameById = new Map(profiles.map((p) => [p.id, p.display_name]));

    const stock: StockExportRow[] = stockRaw
      .filter((s) => s.items)
      .map((s) => ({
        sku: s.items!.sku,
        name: s.items!.name,
        path: paths.get(s.location_id) ?? "",
        code: codeById.get(s.location_id) ?? "",
        qty: s.qty,
        unit: s.items!.unit,
      }))
      .sort((a, b) => a.sku.localeCompare(b.sku) || a.code.localeCompare(b.code));

    // 이력은 최신 순으로 최대 50,000행만 읽는다.
    const total = count.count ?? 0;
    const limit = Math.min(total, EXPORT_HISTORY_LIMIT);
    const offsets: number[] = [];
    for (let o = 0; o < limit; o += PAGE) offsets.push(o);
    const movements: MovementRow[] = [];
    for (let i = 0; i < offsets.length; i += PARALLEL) {
      const chunk = await Promise.all(
        offsets.slice(i, i + PARALLEL).map(async (o) => {
          const { data, error } = await supabase
            .from("movements")
            .select("created_at, type, delta, reason, reverses_id, created_by, location_id, items(sku, name)")
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .range(o, Math.min(o + PAGE, limit) - 1);
          if (error) throw new Error(error.message);
          return (data ?? []) as unknown as MovementRow[];
        }),
      );
      chunk.forEach((rows) => movements.push(...rows));
    }

    const history: HistoryExportRow[] = movements.map((m) => ({
      at: formatKst(m.created_at),
      sku: m.items?.sku ?? "",
      name: m.items?.name ?? "",
      path: paths.get(m.location_id) ?? "",
      type: m.reverses_id !== null ? "정정" : (TYPE_LABEL[m.type] ?? m.type),
      delta: m.delta,
      reason: m.reason ?? "",
      who: (m.created_by && nameById.get(m.created_by)) || "알 수 없음",
    }));
    const note =
      total > limit
        ? `※ 이력이 ${total.toLocaleString("ko-KR")}행이라 최신 ${limit.toLocaleString("ko-KR")}행만 내보냈습니다`
        : undefined;

    const body = await buildExport(stock, history, note);
    return new Response(body as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent("재고_내보내기.xlsx")}`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json({ error: "내보내기에 실패했습니다" }, { status: 500 });
  }
}
