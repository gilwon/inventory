// 데모 모드용 한국어 목데이터 생성 (시각은 호출 시점 기준 상대값)
import type { Tables } from "@/lib/database.types";

export type DemoData = {
  items: Tables<"items">[];
  locations: Tables<"locations">[];
  movements: Tables<"movements">[];
  profiles: Tables<"profiles">[];
  stock: Tables<"stock">[];
};

const uid = (kind: number, n: number) =>
  `00000000-0000-4000-8000-${String(kind).padStart(4, "0")}${String(n).padStart(8, "0")}`;

const U_ADMIN = uid(1, 1);
const U_KIM = uid(1, 2);
const U_LEE = uid(1, 3);

// 데모 사용자는 관리자 프로필과 같은 id 를 쓴다.
export const DEMO_USER_ID = U_ADMIN;
export const DEMO_USER_EMAIL = "admin@demo.example.com";

export function buildDemoData(now = Date.now()): DemoData {
  const ago = (days: number, hours = 0) =>
    new Date(now - (days * 24 + hours) * 3600_000).toISOString();

  const profiles: Tables<"profiles">[] = [
    { id: U_ADMIN, display_name: "관리자(데모)", email: DEMO_USER_EMAIL, role: "admin" },
    { id: U_KIM, display_name: "박현장", email: "park@demo.example.com", role: "worker" },
    { id: U_LEE, display_name: "이창고", email: "lee@demo.example.com", role: "worker" },
  ];

  // [번호, 코드, 이름, 상위 번호, 활성]
  const locDefs: [number, string, string, number | null, boolean][] = [
    [1, "WH", "본사 창고", null, true],
    [2, "WH-A1", "A구역 1번 선반", 1, true],
    [3, "WH-A2", "A구역 2번 선반", 1, true],
    [4, "WH-B1", "B구역 포장대", 1, true],
    [5, "SHOP", "매장", null, true],
    [6, "SHOP-F", "매장 진열대", 5, true],
    [7, "SHOP-B", "매장 백룸", 5, true],
    [8, "TMP", "임시 보관소", null, false],
  ];
  const locations: Tables<"locations">[] = locDefs.map(([n, code, name, parent, active]) => ({
    id: uid(3, n),
    code,
    name,
    parent_id: parent === null ? null : uid(3, parent),
    active,
    created_at: ago(40),
  }));

  // [번호, SKU, 이름, 바코드, 단위, 최소 수량, 활성]
  const itemDefs: [number, string, string, string | null, string, number, boolean][] = [
    [1, "BLT-M8-20", "볼트 M8x20", "8801234500011", "개", 200, true],
    [2, "NUT-M8", "너트 M8", "8801234500028", "개", 200, true],
    [3, "WSH-M8", "와셔 M8", "8801234500035", "개", 300, true],
    [4, "BOX-S", "포장 박스 (소)", "8801234500042", "개", 100, true],
    [5, "BOX-M", "포장 박스 (중)", "8801234500059", "개", 100, true],
    [6, "TAPE-OPP", "OPP 테이프", "8801234500066", "롤", 20, true],
    [7, "LBL-A4", "라벨 용지 A4", "8801234500073", "팩", 10, true],
    [8, "GLV-L", "작업 장갑 (L)", "8801234500080", "켤레", 30, true],
    [9, "CBL-TIE", "케이블 타이", null, "팩", 0, true],
    [10, "BUB-WRP", "에어캡", "8801234500103", "롤", 15, true],
    [11, "SCW-M4", "나사 M4x10", "8801234500110", "개", 500, true],
    [12, "PEN-MK", "마커펜 (검정)", "8801234500127", "자루", 20, false],
  ];
  const items: Tables<"items">[] = itemDefs.map(([n, sku, name, barcode, unit, min, active]) => ({
    id: uid(2, n),
    sku,
    name,
    barcode,
    unit,
    min_qty: min,
    memo: n === 1 ? "생산 라인 주력 부품" : null,
    photo_path: null,
    active,
    created_at: ago(40),
  }));

  // 이력은 오래된 것부터 쌓고 재고는 이력 합계로 계산해 원장과 항상 일치시킨다.
  const movements: Tables<"movements">[] = [];
  const add = (
    days: number,
    type: string,
    item: number,
    loc: number,
    delta: number,
    reason: string | null,
    by: string,
    extra: { group_id?: string; reverses_id?: number } = {},
    hours = 0,
  ) => {
    const id = movements.length + 1;
    movements.push({
      id,
      item_id: uid(2, item),
      location_id: uid(3, loc),
      type,
      delta,
      reason,
      created_by: by,
      created_at: ago(days, hours),
      group_id: extra.group_id ?? null,
      reverses_id: extra.reverses_id ?? null,
    });
    return id;
  };
  const init = "초기/가져오기";

  add(30, "import", 1, 2, 300, init, U_ADMIN);
  add(30, "import", 1, 3, 150, init, U_ADMIN);
  add(30, "import", 2, 2, 400, init, U_ADMIN);
  add(30, "import", 3, 2, 500, init, U_ADMIN);
  add(30, "import", 4, 4, 180, init, U_ADMIN);
  add(30, "import", 5, 4, 150, init, U_ADMIN);
  add(30, "import", 6, 4, 40, init, U_ADMIN);
  add(30, "import", 7, 3, 12, init, U_ADMIN);
  add(30, "import", 8, 3, 50, init, U_ADMIN);
  add(30, "import", 9, 3, 30, init, U_ADMIN);
  add(30, "import", 10, 4, 25, init, U_ADMIN);
  add(30, "import", 11, 2, 900, init, U_ADMIN);
  add(20, "receive", 4, 4, 100, "정기 입고", U_KIM);
  add(15, "issue", 1, 2, -80, "생산 라인 출고", U_KIM);
  add(14, "issue", 11, 2, -580, "주문 출고", U_LEE);
  add(12, "issue", 7, 3, -8, "인쇄 사용", U_LEE);
  add(11, "issue", 8, 3, -28, "현장 지급", U_KIM);
  const g1 = "00000000-0000-4000-8000-000900000001";
  add(9, "transfer_out", 1, 3, -50, "라인 보충", U_KIM, { group_id: g1 });
  add(9, "transfer_in", 1, 2, 50, "라인 보충", U_KIM, { group_id: g1 });
  add(7, "adjust", 2, 2, -12, "실사 차이", U_ADMIN);
  add(6, "receive", 3, 2, 200, "정기 입고", U_KIM);
  add(5, "issue", 5, 4, -40, "주문 출고", U_LEE);
  add(4, "issue", 4, 4, -90, "주문 출고", U_KIM);
  const wrong = add(3, "issue", 10, 4, -5, "주문 출고", U_LEE);
  add(3, "adjust", 10, 4, 5, `정정 (원본 #${wrong})`, U_ADMIN, { reverses_id: wrong }, -1);
  const g2 = "00000000-0000-4000-8000-000900000002";
  add(2, "transfer_out", 6, 4, -10, "매장 보충", U_LEE, { group_id: g2 });
  add(2, "transfer_in", 6, 6, 10, "매장 보충", U_LEE, { group_id: g2 });
  add(1, "receive", 9, 3, 20, "정기 입고", U_KIM);
  add(0, "issue", 2, 2, -50, "생산 라인 출고", U_KIM, {}, 5);

  const sums = new Map<string, Tables<"stock">>();
  for (const m of movements) {
    const key = `${m.item_id}|${m.location_id}`;
    const row = sums.get(key) ?? { item_id: m.item_id, location_id: m.location_id, qty: 0 };
    row.qty += m.delta;
    sums.set(key, row);
  }

  return { items, locations, movements, profiles, stock: [...sums.values()] };
}
