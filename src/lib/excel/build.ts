// 가져오기 양식 파일과 내보내기 파일(현재 재고, 이력)을 만드는 모듈
import ExcelJS from "exceljs";
import {
  ITEM_COLUMNS,
  LOCATION_COLUMNS,
  REQUIRED_COLUMNS,
  SHEET_ITEMS,
  SHEET_LOCATIONS,
} from "./schema";

export const EXPORT_HISTORY_LIMIT = 50000;

export type StockExportRow = {
  sku: string;
  name: string;
  path: string;
  code: string;
  qty: number;
  unit: string;
};

export type HistoryExportRow = {
  at: string;
  sku: string;
  name: string;
  path: string;
  type: string;
  delta: number;
  reason: string;
  who: string;
};

const TEXT = "@";

function headerStyle(ws: ExcelJS.Worksheet) {
  const row = ws.getRow(1);
  row.font = { bold: true };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE4E4E7" } };
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

// 양식 파일. SKU·바코드·코드·위치코드 열은 텍스트 서식이라 선행 0 이 사라지지 않는다.
export async function buildTemplate(): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();

  const sheets: [string, readonly string[], readonly string[], readonly string[]][] = [
    [SHEET_LOCATIONS, LOCATION_COLUMNS, REQUIRED_COLUMNS[SHEET_LOCATIONS], ["코드", "상위코드"]],
    [SHEET_ITEMS, ITEM_COLUMNS, REQUIRED_COLUMNS[SHEET_ITEMS], ["SKU", "바코드", "위치코드"]],
  ];
  for (const [name, cols, required, textCols] of sheets) {
    const ws = wb.addWorksheet(name);
    ws.columns = cols.map((c) => ({
      header: required.includes(c) ? `${c}*` : c,
      key: c,
      width: Math.max(14, c.length * 3),
      style: textCols.includes(c) ? { numFmt: TEXT } : {},
    }));
    headerStyle(ws);
  }

  const guide = wb.addWorksheet("안내");
  guide.getColumn(1).width = 100;
  [
    "* 표시가 있는 열은 필수입니다.",
    "위치 시트는 코드, 이름, 상위코드를 적습니다. 이미 있는 위치 코드는 건너뜁니다.",
    "품목 시트는 품목과 위치의 한 쌍이 한 행입니다. 같은 SKU를 여러 행에 적을 수 있고, 이름은 같아야 합니다.",
    "이미 있는 SKU는 이름, 바코드, 단위, 최소수량, 메모를 갱신합니다. 빈 칸은 기존 값을 유지합니다.",
    "수량은 0 이상의 정수입니다. 이미 수량이 있는 품목과 위치 조합의 수량은 무시됩니다.",
    "파일은 5MB 이하, 위치와 품목을 합쳐 5,000행 이하입니다.",
  ].forEach((t) => guide.addRow([t]));

  return new Uint8Array(await wb.xlsx.writeBuffer());
}

// 내보내기 파일. 문자열은 문자열 셀로만 쓰므로 =, +, -, @ 로 시작해도 수식이 되지 않는다.
export async function buildExport(
  stock: StockExportRow[],
  history: HistoryExportRow[],
  historyNote?: string,
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();

  const s = wb.addWorksheet("현재 재고");
  s.addRow(["SKU", "이름", "위치경로", "위치코드", "수량", "단위"]);
  stock.forEach((r) => s.addRow([r.sku, r.name, r.path, r.code, r.qty, r.unit]));
  s.columns.forEach((c, i) => (c.width = [16, 28, 32, 14, 10, 8][i]));
  headerStyle(s);

  const h = wb.addWorksheet("이력");
  h.addRow(["일시(KST)", "SKU", "이름", "위치경로", "유형", "증감", "사유", "작업자"]);
  history.forEach((r) => h.addRow([r.at, r.sku, r.name, r.path, r.type, r.delta, r.reason, r.who]));
  if (historyNote) h.addRow([historyNote]);
  h.columns.forEach((c, i) => (c.width = [18, 16, 28, 32, 10, 8, 28, 14][i]));
  headerStyle(h);

  return new Uint8Array(await wb.xlsx.writeBuffer());
}
