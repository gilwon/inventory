// 가져오기·내보내기 엑셀의 시트·열 이름 상수와 행·결과 타입

export const SHEET_LOCATIONS = "위치";
export const SHEET_ITEMS = "품목";

// 헤더 이름. 필수 열은 양식에서 "*"를 붙여 보이지만 읽을 때는 "*"를 뗀 이름으로 비교한다.
export const LOCATION_COLUMNS = ["코드", "이름", "상위코드"] as const;
export const ITEM_COLUMNS = [
  "SKU",
  "이름",
  "바코드",
  "단위",
  "최소수량",
  "메모",
  "위치코드",
  "수량",
] as const;
export const REQUIRED_COLUMNS = {
  [SHEET_LOCATIONS]: ["코드", "이름"],
  [SHEET_ITEMS]: ["SKU", "이름"],
} as const;

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_ROWS = 5000;

// 파싱된 위치 행. 모든 값은 앞뒤 공백을 뗀 문자열이다. row 는 엑셀 행 번호(헤더가 1).
export type LocationRow = {
  row: number;
  code: string;
  name: string;
  parentCode: string;
};

// 파싱된 품목 행. 수량·최소수량도 문자열로 두고 검증은 validate.ts 가 한다.
export type ItemRow = {
  row: number;
  sku: string;
  name: string;
  barcode: string;
  unit: string;
  minQty: string;
  memo: string;
  locationCode: string;
  qty: string;
};

export type ParsedWorkbook = {
  locations: LocationRow[];
  items: ItemRow[];
};

// 행별 상태. existing 은 이미 있는 위치, ignored 는 수량이 무시되는 품목 행이다.
export type RowStatus = "new" | "update" | "existing" | "ignored" | "error";

export type RowResult = {
  sheet: typeof SHEET_LOCATIONS | typeof SHEET_ITEMS;
  row: number;
  // 화면에 보여 줄 식별자(위치 코드 또는 SKU와 위치 코드)
  label: string;
  status: RowStatus;
  reason: string;
};

// import_apply RPC 에 보내는 payload. 수량은 숫자 타입이다.
export type ImportPayload = {
  locations: { code: string; name: string; parent_code: string | null }[];
  items: {
    sku: string;
    name: string;
    barcode: string | null;
    unit: string | null;
    min_qty: number | null;
    memo: string | null;
  }[];
  stocks: { sku: string; location_code: string; qty: number }[];
};

// 검증에 쓰는 기존 상태 스냅샷. 키는 모두 trim 후 소문자이다.
export type Snapshot = {
  // 위치 코드 -> 활성 여부
  locations: Map<string, boolean>;
  // SKU -> 활성 여부
  items: Map<string, boolean>;
  // 바코드 -> SKU
  barcodes: Map<string, string>;
  // 수량이 0보다 큰 "SKU|위치코드" 조합
  stocks: Set<string>;
};
