"use server";
// 선택한 품목·위치의 QR 또는 바코드 라벨 데이터(SVG 포함)를 만드는 Server Action

import { toSVG } from "bwip-js/node";
import QRCode from "qrcode";
import { isLabelFormat, unsupportedCodes, type LabelFormat } from "@/lib/label-format";
import { buildLocationPaths } from "@/lib/location-path";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "../items/common";

export type Label = {
  key: string;
  name: string;
  code: string;
  svg: string;
  format: LabelFormat;
};
export type LabelsResult =
  | { ok: true; labels: Label[] }
  | { ok: false; error: string };

// A4 5장 분량(24칸×5)까지만 만든다.
const MAX_LABELS = 120;

// QR 내용은 품목은 SKU, 위치는 위치 코드 그대로다. 스캔 해석 규칙(R25)과 같다.
export async function buildLabels(
  itemIds: string[],
  locationIds: string[],
  format: string,
): Promise<LabelsResult> {
  if (!isLabelFormat(format))
    return { ok: false, error: "출력 형식이 올바르지 않습니다." };
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

  // 바코드는 만들 수 없는 코드가 하나라도 있으면 일부만 빠진 인쇄물을 막으려고 전부 만들지 않는다.
  if (format === "barcode") {
    const bad = unsupportedCodes(rows.map((r) => r.code));
    if (bad.length > 0) {
      const shown = bad.slice(0, 5).join(", ");
      const more = bad.length > 5 ? ` 외 ${bad.length - 5}개` : "";
      return {
        ok: false,
        error: `바코드로 만들 수 없는 코드가 있습니다(영문·숫자·기호 24자 이하만 가능). 해당 항목을 빼거나 QR로 바꿔 주세요. 대상 ${shown}${more}`,
      };
    }
  }

  // 인쇄는 항상 흰 바탕에 검정이어야 해서 색을 고정한다.
  const labels = await Promise.all(
    rows.map(async (r): Promise<Label> => ({
      ...r,
      format,
      svg: format === "barcode" ? barcodeSvg(r.code) : await qrSvg(r.code),
    })),
  );
  return { ok: true, labels };
}

async function qrSvg(code: string): Promise<string> {
  return QRCode.toString(code, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });
}

// width/height 속성 없이 viewBox만 나오고 코드 글자는 SVG에 들어가지 않는다(includetext false).
// 1차원 바코드는 가로만 늘려도 막대 폭 비율이 같아 칸 크기에 맞춰 늘리도록 none으로 둔다.
function barcodeSvg(code: string): string {
  const svg = toSVG({
    bcid: "code128",
    text: code,
    includetext: false,
    height: 10,
    paddingwidth: 0,
    paddingheight: 0,
    barcolor: "000000",
    backgroundcolor: "ffffff",
  });
  return svg.replace("<svg ", '<svg preserveAspectRatio="none" ');
}
