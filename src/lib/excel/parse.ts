// 업로드된 xlsx 를 행 배열로 읽고, 검증에 쓸 기존 상태 스냅샷을 DB 에서 읽는 모듈
import ExcelJS from "exceljs";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ITEM_COLUMNS,
  LOCATION_COLUMNS,
  MAX_FILE_BYTES,
  MAX_ROWS,
  REQUIRED_COLUMNS,
  SHEET_ITEMS,
  SHEET_LOCATIONS,
  type ItemRow,
  type LocationRow,
  type ParsedWorkbook,
  type Snapshot,
} from "./schema";

// 사용자에게 그대로 보여 줄 수 있는 업로드 오류
export class UploadError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

// 수식·서식 값, 날짜, rich text 를 모두 trim 된 문자열로 바꾼다.
export function cellToString(v: ExcelJS.CellValue | undefined): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((t) => t.text).join("").trim();
    if ("result" in v) return cellToString(v.result as ExcelJS.CellValue);
    if ("text" in v) return cellToString(v.text as ExcelJS.CellValue);
    if ("error" in v) return "";
  }
  return "";
}

// 첫 행의 헤더("*" 제거)로 열 번호를 찾는다. 필수 열이 없으면 오류.
function readSheet(
  wb: ExcelJS.Workbook,
  name: keyof typeof REQUIRED_COLUMNS,
  columns: readonly string[],
): { row: number; cells: Record<string, string> }[] {
  const ws = wb.getWorksheet(name);
  if (!ws) throw new UploadError(`시트 "${name}"이(가) 없습니다. 양식 파일을 사용하세요`);

  const index = new Map<string, number>();
  ws.getRow(1).eachCell((cell, col) => {
    const h = cellToString(cell.value).replace(/\*$/, "").trim();
    if (h && !index.has(h)) index.set(h, col);
  });
  for (const req of REQUIRED_COLUMNS[name]) {
    if (!index.has(req)) {
      throw new UploadError(`시트 "${name}"에 "${req}" 열이 없습니다. 양식 파일을 사용하세요`);
    }
  }

  const out: { row: number; cells: Record<string, string> }[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const cells: Record<string, string> = {};
    for (const c of columns) {
      const col = index.get(c);
      cells[c] = col ? cellToString(row.getCell(col).value) : "";
    }
    if (Object.values(cells).some((v) => v !== "")) out.push({ row: rowNumber, cells });
  });
  return out;
}

export async function parseWorkbook(buffer: ArrayBuffer): Promise<ParsedWorkbook> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0]);
  } catch {
    throw new UploadError("엑셀(.xlsx) 파일을 읽을 수 없습니다");
  }

  const locations: LocationRow[] = readSheet(wb, SHEET_LOCATIONS, LOCATION_COLUMNS).map(
    ({ row, cells }) => ({
      row,
      code: cells["코드"],
      name: cells["이름"],
      parentCode: cells["상위코드"],
    }),
  );
  const items: ItemRow[] = readSheet(wb, SHEET_ITEMS, ITEM_COLUMNS).map(({ row, cells }) => ({
    row,
    sku: cells["SKU"],
    name: cells["이름"],
    barcode: cells["바코드"],
    unit: cells["단위"],
    minQty: cells["최소수량"],
    memo: cells["메모"],
    locationCode: cells["위치코드"],
    qty: cells["수량"],
  }));

  if (locations.length + items.length > MAX_ROWS) {
    throw new UploadError(`행이 너무 많습니다. 위치와 품목을 합쳐 ${MAX_ROWS.toLocaleString("ko-KR")}행 이하만 가져올 수 있습니다`, 413);
  }
  return { locations, items };
}

// 압축 해제 후 총 크기 상한. zip 폭탄을 exceljs 로 읽기 전에 막는다.
const MAX_UNZIPPED_BYTES = 50 * 1024 * 1024;

// zip 중앙 디렉터리의 비압축 크기 합을 검사한다. 읽을 수 없거나 zip64 이면 거절한다.
// shortcut: 헤더 값만 믿는다(헤더 위조 시 실제 크기와 다를 수 있음), 스트리밍 해제 한도가 필요하면 그때 교체.
export function assertZipSize(buf: ArrayBuffer, max = MAX_UNZIPPED_BYTES): void {
  const bad = () => new UploadError("엑셀(.xlsx) 파일을 읽을 수 없습니다");
  if (buf.byteLength < 22) throw bad();
  const v = new DataView(buf);
  // EOCD 는 끝에서 22바이트 + 주석(최대 65535) 범위에 있다.
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 22 - 0xffff); i--) {
    if (v.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw bad();
  const count = v.getUint16(eocd + 10, true);
  const size = v.getUint32(eocd + 12, true);
  let off = v.getUint32(eocd + 16, true);
  if (count === 0xffff || size === 0xffffffff || off === 0xffffffff) throw bad();
  if (off + size > eocd) throw bad();
  let total = 0;
  for (let n = 0; n < count; n++) {
    if (off + 46 > buf.byteLength || v.getUint32(off, true) !== 0x02014b50) throw bad();
    const uncompressed = v.getUint32(off + 24, true);
    if (uncompressed === 0xffffffff || v.getUint32(off + 20, true) === 0xffffffff) throw bad();
    total += uncompressed;
    if (total > max) throw new UploadError("파일 내용이 너무 큽니다", 413);
    off += 46 + v.getUint16(off + 28, true) + v.getUint16(off + 30, true) + v.getUint16(off + 32, true);
  }
}

// 요청의 multipart 에서 "file" 을 꺼내 검사하고 파싱한다.
export async function readUpload(request: Request): Promise<ParsedWorkbook> {
  const header = request.headers.get("content-length");
  const length = header === null || header.trim() === "" ? NaN : Number(header);
  if (!Number.isFinite(length) || length < 0) {
    throw new UploadError("요청 크기를 확인할 수 없습니다", 411);
  }
  // multipart 오버헤드를 감안해 여유를 둔다.
  if (length > MAX_FILE_BYTES + 64 * 1024) {
    throw new UploadError("파일이 너무 큽니다. 5MB 이하만 올릴 수 있습니다", 413);
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new UploadError("파일을 받지 못했습니다");
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new UploadError("파일을 선택하세요");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new UploadError("파일이 너무 큽니다. 5MB 이하만 올릴 수 있습니다", 413);
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new UploadError("엑셀(.xlsx) 파일만 올릴 수 있습니다");
  }
  const buf = await file.arrayBuffer();
  assertZipSize(buf);
  return parseWorkbook(buf);
}

// 타입 없는 클라이언트는 조인 결과를 배열로 추론하므로 data 는 unknown 으로 받고 호출부 타입을 믿는다.
type PageResult = PromiseLike<{ data: unknown; error: { message: string } | null }>;

// Supabase 는 한 번에 1,000행까지만 돌려주므로 range 로 나눠 끝까지 읽는다.
export async function fetchAll<T>(
  page: (from: number, to: number) => PageResult,
  size = 1000,
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += size) {
    const { data: raw, error } = await page(from, from + size - 1);
    if (error) throw new Error(error.message);
    const data = (raw ?? []) as T[];
    all.push(...data);
    if (data.length < size) return all;
  }
}

// 검증용 기존 상태를 읽는다. 키는 모두 trim 후 소문자이다.
export async function loadSnapshot(supabase: SupabaseClient): Promise<Snapshot> {
  const [locs, items, stocks] = await Promise.all([
    fetchAll<{ code: string; active: boolean }>((f, t) =>
      supabase.from("locations").select("code, active").order("id").range(f, t),
    ),
    fetchAll<{ sku: string; barcode: string | null; active: boolean }>((f, t) =>
      supabase.from("items").select("sku, barcode, active").order("id").range(f, t),
    ),
    fetchAll<{ items: { sku: string } | null; locations: { code: string } | null }>((f, t) =>
      supabase
        .from("stock")
        .select("items(sku), locations(code)")
        .gt("qty", 0)
        .order("item_id")
        .order("location_id")
        .range(f, t),
    ),
  ]);

  const snap: Snapshot = {
    locations: new Map(locs.map((l) => [l.code.trim().toLowerCase(), l.active])),
    items: new Map(items.map((i) => [i.sku.trim().toLowerCase(), i.active])),
    barcodes: new Map(),
    stocks: new Set(),
  };
  for (const i of items) {
    if (i.barcode) snap.barcodes.set(i.barcode.trim().toLowerCase(), i.sku.trim().toLowerCase());
  }
  for (const s of stocks) {
    if (s.items && s.locations) {
      snap.stocks.add(`${s.items.sku.trim().toLowerCase()}|${s.locations.code.trim().toLowerCase()}`);
    }
  }
  return snap;
}
