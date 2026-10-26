"use server";
// 선택한 품목·위치의 QR 라벨 데이터(SVG 포함)를 만드는 Server Action

import QRCode from "qrcode";
import { buildLocationPaths } from "@/lib/location-path";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "../items/common";

export type Label = { key: string; name: string; code: string; svg: string };
export type LabelsResult =
  | { ok: true; labels: Label[] }
  | { ok: false; error: string };

// A4 5장 분량(24칸×5)까지만 만든다.
const MAX_LABELS = 120;

// QR 내용은 품목은 SKU, 위치는 위치 코드 그대로다. 스캔 해석 규칙(R25)과 같다.
export async function buildLabels(
  itemIds: string[],
  locationIds: string[],
): Promise<LabelsResult> {
  const iIds = [...new Set(Array.isArray(itemIds) ? itemIds : [])].filter(
    (v) => typeof v === "string" && isUuid(v),
  );
  const lIds = [...new Set(Array.isArray(locationIds) ? locationIds : [])].filter(
    (v) => typeof v === "string" && isUuid(v),
  );
  if (iIds.length + lIds.length === 0)
    return { ok: false, error: "라벨로 만들 품목이나 위치를 선택해 주세요." };
  if (iIds.length + lIds.length > MAX_LABELS)
    return { ok: false, error: `한 번에 ${MAX_LABELS}개까지 만들 수 있습니다.` };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const [itemsRes, locsRes] = await Promise.all([
    iIds.length
      ? supabase.from("items").select("id,sku,name").in("id", iIds)
      : Promise.resolve({ data: [], error: null }),
    // 경로 문자열을 만들려면 상위 위치까지 필요해 전체를 읽는다.
    supabase.from("locations").select("id,parent_id,code,name"),
  ]);
  if (itemsRes.error || locsRes.error)
    return { ok: false, error: "불러오지 못했습니다. 잠시 후 다시 시도해 주세요." };

  const allLocs = locsRes.data ?? [];
  const paths = buildLocationPaths(allLocs);
  const rows = [
    ...iIds.flatMap((id) => {
      const it = (itemsRes.data ?? []).find((i) => i.id === id);
      return it ? [{ key: `i-${id}`, name: it.name, code: it.sku }] : [];
    }),
    ...lIds.flatMap((id) => {
      const l = allLocs.find((x) => x.id === id);
      return l ? [{ key: `l-${id}`, name: paths.get(id) ?? l.name, code: l.code }] : [];
    }),
  ];

  // 인쇄는 항상 흰 바탕에 검정 QR이어야 해서 색을 고정한다.
  const labels = await Promise.all(
    rows.map(async (r) => ({
      ...r,
      svg: await QRCode.toString(r.code, {
        type: "svg",
        margin: 0,
        errorCorrectionLevel: "M",
        color: { dark: "#000000", light: "#ffffff" },
      }),
    })),
  );
  return { ok: true, labels };
}
