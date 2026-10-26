"use server";
// 스캔한 문자열을 DB에서 품목 또는 위치로 해석하는 Server Action

import { createClient } from "@/lib/supabase/server";
import { escapeLike, normalizeScan, pickScanMatch } from "@/lib/scan";

export type ScanOutcome =
  | { kind: "item" | "location"; id: string; title: string; sub: string }
  | { kind: "none" }
  | { kind: "error"; message: string };

// SKU, 바코드, 위치 코드 순서로 대소문자 무시 완전 일치를 찾는다.
export async function resolveScan(raw: string): Promise<ScanOutcome> {
  const code = normalizeScan(raw);
  if (!code) return { kind: "none" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { kind: "error", message: "로그인이 필요합니다." };

  // ILIKE는 와일드카드를 이스케이프해 사실상 대소문자 무시 일치로 쓰고, 최종 판정은 순수 함수가 한다.
  const pat = escapeLike(code);
  const [bySku, byBarcode, locs] = await Promise.all([
    supabase.from("items").select("id,sku,barcode,name").ilike("sku", pat).limit(5),
    supabase.from("items").select("id,sku,barcode,name").ilike("barcode", pat).limit(5),
    supabase.from("locations").select("id,code,name").ilike("code", pat).limit(5),
  ]);
  if (bySku.error || byBarcode.error || locs.error) {
    return { kind: "error", message: "조회에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }

  const items = [...(bySku.data ?? []), ...(byBarcode.data ?? [])];
  const locations = locs.data ?? [];
  const hit = pickScanMatch(code, items, locations);
  if (!hit) return { kind: "none" };

  if (hit.kind === "item") {
    const it = items.find((i) => i.id === hit.id)!;
    return { kind: "item", id: it.id, title: it.name, sub: `SKU ${it.sku}` };
  }
  const loc = locations.find((l) => l.id === hit.id)!;
  return { kind: "location", id: loc.id, title: loc.name, sub: `위치 코드 ${loc.code}` };
}
