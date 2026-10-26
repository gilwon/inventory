// 파싱된 행과 기존 상태 스냅샷으로 행별 상태·사유와 RPC payload 를 만드는 순수 함수
import {
  SHEET_ITEMS,
  SHEET_LOCATIONS,
  type ImportPayload,
  type ItemRow,
  type LocationRow,
  type ParsedWorkbook,
  type RowResult,
  type RowStatus,
  type Snapshot,
} from "./schema";

const MAX_INT = 2147483647;

// DB 의 lower() 유일 인덱스와 같은 규칙으로 비교 키를 만든다.
export const key = (s: string) => s.trim().toLowerCase();

// 빈 문자열이면 null, 아니면 정수. 정수가 아니면 reason 문자열을 돌려준다.
function parseNonNegInt(raw: string): { value: number | null; error?: string } {
  const s = raw.trim();
  if (s === "") return { value: null };
  if (/^-\d+(\.\d+)?$/.test(s)) return { value: null, error: "음수는 입력할 수 없습니다" };
  if (!/^\d+$/.test(s)) return { value: null, error: "정수가 아닙니다" };
  const n = Number(s);
  if (n > MAX_INT) return { value: null, error: "값이 너무 큽니다" };
  return { value: n };
}

export type ValidationOutput = {
  rows: RowResult[];
  hasError: boolean;
  // 오류가 없을 때만 채워진다.
  payload: ImportPayload | null;
};

export function validateWorkbook(
  parsed: ParsedWorkbook,
  snap: Snapshot,
): ValidationOutput {
  const locResults = validateLocations(parsed.locations, snap);
  // 파일에 정의된 위치 코드(오류 행 포함)를 품목 검증에 쓴다.
  const fileLocs = new Map<string, LocationRow>();
  for (const l of parsed.locations) {
    if (l.code && !fileLocs.has(key(l.code))) fileLocs.set(key(l.code), l);
  }
  const itemResults = validateItems(parsed.items, snap, fileLocs);

  const rows = [...locResults, ...itemResults];
  const hasError = rows.some((r) => r.status === "error");
  return {
    rows,
    hasError,
    payload: hasError ? null : buildPayload(parsed, locResults),
  };
}

function validateLocations(list: LocationRow[], snap: Snapshot): RowResult[] {
  const results: RowResult[] = [];
  const seen = new Set<string>();
  // 새로 만들 위치의 코드 -> 상위 코드 (순환 검사용)
  const newParent = new Map<string, string>();
  const fileCodes = new Set(list.filter((l) => l.code).map((l) => key(l.code)));

  const push = (l: LocationRow, status: RowStatus, reason: string) =>
    results.push({ sheet: SHEET_LOCATIONS, row: l.row, label: l.code, status, reason });

  for (const l of list) {
    if (!l.code || !l.name) {
      push(l, "error", !l.code ? "코드가 비어 있습니다" : "이름이 비어 있습니다");
      continue;
    }
    const k = key(l.code);
    if (seen.has(k)) {
      push(l, "error", "파일 안에서 위치 코드가 중복됩니다");
      continue;
    }
    seen.add(k);
    if (snap.locations.has(k)) {
      push(l, "existing", "이미 있는 위치입니다. 이름과 상위 위치는 바꾸지 않습니다");
      continue;
    }
    if (l.parentCode) {
      const pk = key(l.parentCode);
      if (pk === k) {
        push(l, "error", "자기 자신을 상위 위치로 지정할 수 없습니다");
        continue;
      }
      if (!fileCodes.has(pk) && !snap.locations.has(pk)) {
        push(l, "error", `존재하지 않는 상위 코드입니다 (${l.parentCode})`);
        continue;
      }
      if (snap.locations.get(pk) === false) {
        push(l, "error", `보관된 위치는 상위로 지정할 수 없습니다 (${l.parentCode})`);
        continue;
      }
      newParent.set(k, pk);
    }
    push(l, "new", "새 위치를 만듭니다");
  }

  // 순환 검사. 새 위치끼리 상위를 따라가다 자기 자신으로 돌아오면 오류이다.
  for (const r of results) {
    if (r.status !== "new") continue;
    const start = key(r.label);
    let cur = newParent.get(start);
    for (let i = 0; cur && i <= newParent.size; i++) {
      if (cur === start) {
        r.status = "error";
        r.reason = "상위 코드가 순환합니다";
        break;
      }
      cur = newParent.get(cur);
    }
  }
  return results;
}

function validateItems(
  list: ItemRow[],
  snap: Snapshot,
  fileLocs: Map<string, LocationRow>,
): RowResult[] {
  const results: RowResult[] = [];
  // SKU -> 처음 나온 행 (이름·바코드 일치 검사용)
  const firstBySku = new Map<string, ItemRow>();
  const barcodeOwner = new Map<string, string>();
  const seenPair = new Set<string>();

  for (const it of list) {
    const label = it.locationCode ? `${it.sku} / ${it.locationCode}` : it.sku;
    const fail = (reason: string) =>
      results.push({ sheet: SHEET_ITEMS, row: it.row, label, status: "error", reason });

    if (!it.sku || !it.name) {
      fail(!it.sku ? "SKU가 비어 있습니다" : "이름이 비어 있습니다");
      continue;
    }
    const sk = key(it.sku);

    const first = firstBySku.get(sk);
    if (!first) firstBySku.set(sk, it);
    else if (first.name !== it.name) {
      fail(`같은 SKU의 이름이 ${first.row}행과 다릅니다`);
      continue;
    }

    const mq = parseNonNegInt(it.minQty);
    if (mq.error) {
      fail(`최소수량 ${mq.error}`);
      continue;
    }

    if (it.barcode) {
      const bk = key(it.barcode);
      const owner = barcodeOwner.get(bk);
      if (owner !== undefined && owner !== sk) {
        fail(`파일 안에서 다른 SKU가 같은 바코드를 씁니다 (${it.barcode})`);
        continue;
      }
      if (first && first !== it && first.barcode && key(first.barcode) !== bk) {
        fail(`같은 SKU의 바코드가 ${first.row}행과 다릅니다`);
        continue;
      }
      const dbOwner = snap.barcodes.get(bk);
      if (dbOwner !== undefined && dbOwner !== sk) {
        fail(`이미 다른 품목이 쓰는 바코드입니다 (${it.barcode})`);
        continue;
      }
      barcodeOwner.set(bk, sk);
    }

    const exists = snap.items.has(sk);
    if (exists && snap.items.get(sk) === false && it.locationCode) {
      fail("보관된 품목에는 수량을 가져올 수 없습니다");
      continue;
    }

    // 수량 열 검사
    let qty: number | null = null;
    if (it.locationCode) {
      const lk = key(it.locationCode);
      if (!fileLocs.has(lk) && !snap.locations.has(lk)) {
        fail(`존재하지 않는 위치 코드입니다 (${it.locationCode})`);
        continue;
      }
      if (snap.locations.get(lk) === false) {
        fail(`보관된 위치입니다 (${it.locationCode})`);
        continue;
      }
      if (it.qty === "") {
        fail("위치 코드가 있으면 수량이 필요합니다");
        continue;
      }
      const q = parseNonNegInt(it.qty);
      if (q.error) {
        fail(`수량 ${q.error}`);
        continue;
      }
      qty = q.value;
      const pair = `${sk}|${lk}`;
      if (seenPair.has(pair)) {
        fail("같은 SKU와 위치 코드 조합이 파일에 두 번 나옵니다");
        continue;
      }
      seenPair.add(pair);
    } else if (it.qty !== "") {
      fail("수량을 가져오려면 위치 코드가 필요합니다");
      continue;
    }

    const base: RowStatus = exists ? "update" : "new";
    const baseReason = exists
      ? "기존 품목 정보를 갱신합니다 (빈 칸은 기존 값을 유지합니다)"
      : "새 품목을 만듭니다";
    const lk = it.locationCode ? key(it.locationCode) : "";
    if (qty === 0) {
      results.push({
        sheet: SHEET_ITEMS,
        row: it.row,
        label,
        status: "ignored",
        reason: `수량 0은 가져오지 않습니다. ${baseReason}`,
      });
    } else if (lk && snap.stocks.has(`${sk}|${lk}`)) {
      results.push({
        sheet: SHEET_ITEMS,
        row: it.row,
        label,
        status: "ignored",
        reason: `수량 무시됨, 이미 수량이 있습니다. ${baseReason}`,
      });
    } else {
      results.push({ sheet: SHEET_ITEMS, row: it.row, label, status: base, reason: baseReason });
    }
  }
  return results;
}

// 오류가 없는 파일에서 import_apply payload 를 만든다. 수량은 숫자로 보낸다.
function buildPayload(parsed: ParsedWorkbook, locResults: RowResult[]): ImportPayload {
  const newRows = new Set(
    locResults.filter((r) => r.status === "new").map((r) => r.row),
  );
  const locations = parsed.locations
    .filter((l) => newRows.has(l.row))
    .map((l) => ({
      code: l.code,
      name: l.name,
      parent_code: l.parentCode || null,
    }));

  // 같은 SKU 는 한 건으로 합친다. 값이 있는 첫 칸을 쓴다.
  const merged = new Map<string, ImportPayload["items"][number]>();
  for (const it of parsed.items) {
    const k = key(it.sku);
    const cur = merged.get(k) ?? {
      sku: it.sku,
      name: it.name,
      barcode: null,
      unit: null,
      min_qty: null,
      memo: null,
    };
    cur.barcode ??= it.barcode || null;
    cur.unit ??= it.unit || null;
    cur.min_qty ??= it.minQty === "" ? null : Number(it.minQty);
    cur.memo ??= it.memo || null;
    merged.set(k, cur);
  }

  const stocks = parsed.items
    .filter((it) => it.locationCode)
    .map((it) => ({
      sku: it.sku,
      location_code: it.locationCode,
      qty: Number(it.qty),
    }));

  return { locations, items: [...merged.values()], stocks };
}
