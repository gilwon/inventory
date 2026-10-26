// 스캔한 문자열을 품목 SKU, 품목 바코드, 위치 코드 순서로 해석하는 순수 규칙

export type ScanMatch = { kind: "item" | "location"; id: string };

const MAX_LEN = 200;

// 앞뒤 공백을 지우고 길이를 제한한다. 문자열이 아니면 빈 문자열.
export function normalizeScan(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().slice(0, MAX_LEN) : "";
}

// ILIKE 패턴에서 와일드카드로 읽히는 문자를 이스케이프한다.
// PostgREST 는 값의 `*` 도 와일드카드로 읽고 이스케이프할 방법이 없어, 한 글자 와일드카드로 바꿔 범위를 좁힌다.
export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`).replace(/\*/g, "_");
}

// DB에서 가져온 후보 중 대소문자 무시 완전 일치를 SKU, 바코드, 위치 코드 순서로 고른다.
export function pickScanMatch(
  raw: unknown,
  items: { id: string; sku: string; barcode: string | null }[],
  locations: { id: string; code: string }[],
): ScanMatch | null {
  const code = normalizeScan(raw).toLowerCase();
  if (!code) return null;
  const bySku = items.find((i) => i.sku.toLowerCase() === code);
  if (bySku) return { kind: "item", id: bySku.id };
  const byBarcode = items.find((i) => i.barcode?.toLowerCase() === code);
  if (byBarcode) return { kind: "item", id: byBarcode.id };
  const loc = locations.find((l) => l.code.toLowerCase() === code);
  return loc ? { kind: "location", id: loc.id } : null;
}
