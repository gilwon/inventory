// 데모 모드용 메모리 목 Supabase 클라이언트 (현재 코드가 쓰는 질의 표면만 지원한다)
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { buildDemoData, DEMO_USER_EMAIL, DEMO_USER_ID, type DemoData } from "./data";
import { DEMO_MSG } from "./index";

type Row = Record<string, unknown>;
type Table = keyof DemoData;
type Pred = (r: Row) => boolean;

// 임베드 이름 → 대상 테이블과 외래 키
const REL: Partial<Record<Table, Record<string, { table: Table; fk: string }>>> = {
  movements: {
    items: { table: "items", fk: "item_id" },
    locations: { table: "locations", fk: "location_id" },
    profiles: { table: "profiles", fk: "created_by" },
  },
  stock: {
    items: { table: "items", fk: "item_id" },
    locations: { table: "locations", fk: "location_id" },
  },
};

// 데이터를 바꾸는 rpc 는 모두 막는다.
const WRITE_RPC = new Set([
  "record_receive",
  "record_issue",
  "record_transfer",
  "record_adjust",
  "record_stocktake",
  "reverse_movement",
  "import_apply",
  "set_user_role",
]);

const demoError = () => ({ message: DEMO_MSG });

type Sel = { cols: string[]; embeds: { name: string; inner: boolean; sel: Sel }[] };

// 괄호 바깥의 쉼표로만 나눈다.
function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((t) => t.trim()).filter(Boolean);
}

function parseSelect(s: string): Sel {
  const sel: Sel = { cols: [], embeds: [] };
  for (const tok of splitTop(s || "*")) {
    const m = /^(\w+)(!inner)?\(([\s\S]*)\)$/.exec(tok);
    if (m) sel.embeds.push({ name: m[1], inner: Boolean(m[2]), sel: parseSelect(m[3]) });
    else sel.cols.push(tok);
  }
  return sel;
}

const ISO = /^\d{4}-\d\d-\d\dT/;
function cmp(a: unknown, b: unknown): number {
  let x = a as string | number;
  let y = b as string | number;
  if (typeof x === "string" && typeof y === "string" && ISO.test(x) && ISO.test(y)) {
    x = Date.parse(x);
    y = Date.parse(y);
  }
  return x < y ? -1 : x > y ? 1 : 0;
}

// LIKE 패턴(%, _, 백슬래시 이스케이프)을 대소문자 무시 정규식으로 바꾼다.
function likeRegex(pat: string): RegExp {
  let re = "";
  for (let i = 0; i < pat.length; i++) {
    const ch = pat[i];
    if (ch === "\\" && i + 1 < pat.length) re += pat[++i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    else if (ch === "%") re += ".*";
    else if (ch === "_") re += ".";
    else re += ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`, "is");
}

class Query implements PromiseLike<unknown> {
  private sel: Sel = parseSelect("*");
  private preds: Pred[] = [];
  private orders: { col: string; asc: boolean; nullsFirst: boolean }[] = [];
  private from = 0;
  private to: number | undefined;
  private count = false;
  private head = false;
  private one: "single" | "maybe" | null = null;
  private mutating = false;

  constructor(
    private db: DemoData,
    private table: Table,
  ) {}

  // 점이 든 컬럼(items.active)은 임베드된 부모 행의 값을 본다.
  private get(r: Row, col: string): unknown {
    const [rel, c] = col.includes(".") ? col.split(".") : [null, col];
    if (!rel) return r[col];
    return this.related(r, rel)?.[c];
  }

  private related(r: Row, name: string): Row | null {
    const def = REL[this.table]?.[name];
    if (!def) throw new Error(`데모 클라이언트가 지원하지 않는 임베드: ${this.table}.${name}`);
    return (this.db[def.table] as Row[]).find((x) => x.id === r[def.fk]) ?? null;
  }

  private project(r: Row, sel: Sel, table: Table): Row {
    const out: Row = {};
    for (const c of sel.cols) {
      if (c === "*") Object.assign(out, r);
      else out[c] = r[c];
    }
    for (const e of sel.embeds) {
      const def = REL[table]?.[e.name];
      if (!def) throw new Error(`데모 클라이언트가 지원하지 않는 임베드: ${table}.${e.name}`);
      const rel = (this.db[def.table] as Row[]).find((x) => x.id === r[def.fk]) ?? null;
      out[e.name] = rel ? this.project(rel, e.sel, def.table) : null;
    }
    return out;
  }

  private pred(op: string, col: string, val: unknown): Pred {
    const g = (r: Row) => this.get(r, col);
    switch (op) {
      case "eq":
        return (r) => g(r) != null && String(g(r)) === String(val);
      case "neq":
        return (r) => g(r) != null && String(g(r)) !== String(val);
      case "gt":
        return (r) => g(r) != null && cmp(g(r), val) > 0;
      case "gte":
        return (r) => g(r) != null && cmp(g(r), val) >= 0;
      case "lt":
        return (r) => g(r) != null && cmp(g(r), val) < 0;
      case "lte":
        return (r) => g(r) != null && cmp(g(r), val) <= 0;
      case "in":
        return (r) => g(r) != null && (val as unknown[]).some((v) => String(v) === String(g(r)));
      case "is":
        return (r) => (val === null ? g(r) == null : g(r) === val);
      case "ilike":
        return (r) => typeof g(r) === "string" && likeRegex(String(val)).test(g(r) as string);
      default:
        throw new Error(`데모 클라이언트가 지원하지 않는 필터: ${op}`);
    }
  }

  private add(op: string, col: string, val: unknown) {
    this.preds.push(this.pred(op, col, val));
    return this;
  }

  select(cols = "*", opts: { count?: string; head?: boolean } = {}) {
    this.sel = parseSelect(cols);
    this.count = Boolean(opts.count);
    this.head = Boolean(opts.head);
    return this;
  }
  insert() {
    this.mutating = true;
    return this;
  }
  update() {
    return this.insert();
  }
  delete() {
    return this.insert();
  }
  upsert() {
    return this.insert();
  }

  eq(c: string, v: unknown) {
    return this.add("eq", c, v);
  }
  neq(c: string, v: unknown) {
    return this.add("neq", c, v);
  }
  gt(c: string, v: unknown) {
    return this.add("gt", c, v);
  }
  gte(c: string, v: unknown) {
    return this.add("gte", c, v);
  }
  lt(c: string, v: unknown) {
    return this.add("lt", c, v);
  }
  lte(c: string, v: unknown) {
    return this.add("lte", c, v);
  }
  in(c: string, v: unknown[]) {
    return this.add("in", c, v);
  }
  is(c: string, v: unknown) {
    return this.add("is", c, v);
  }
  ilike(c: string, v: string) {
    return this.add("ilike", c, v);
  }
  not(c: string, op: string, v: unknown) {
    const p = this.pred(op, c, v);
    this.preds.push((r) => !p(r));
    return this;
  }

  order(col: string, opts: { ascending?: boolean; nullsFirst?: boolean } = {}) {
    const asc = opts.ascending ?? true;
    // Postgres 기본값은 null 을 가장 큰 값으로 본다.
    this.orders.push({ col, asc, nullsFirst: opts.nullsFirst ?? !asc });
    return this;
  }
  range(f: number, t: number) {
    this.from = f;
    this.to = t;
    return this;
  }
  limit(n: number) {
    return this.range(0, n - 1);
  }
  single() {
    this.one = "single";
    return this;
  }
  maybeSingle() {
    this.one = "maybe";
    return this;
  }

  private run() {
    if (this.mutating) return { data: null, error: demoError(), count: null };

    let rows = (this.db[this.table] as Row[]).filter((r) => this.preds.every((p) => p(r)));
    // !inner 임베드는 부모가 없는 행을 뺀다.
    for (const e of this.sel.embeds) if (e.inner) rows = rows.filter((r) => this.related(r, e.name));

    rows = [...rows].sort((a, b) => {
      for (const o of this.orders) {
        const x = this.get(a, o.col);
        const y = this.get(b, o.col);
        if (x == null || y == null) {
          if (x == null && y == null) continue;
          return (x == null) === o.nullsFirst ? -1 : 1;
        }
        const c = cmp(x, y);
        if (c) return o.asc ? c : -c;
      }
      return 0;
    });

    const total = rows.length;
    const paged = rows.slice(this.from, this.to === undefined ? undefined : this.to + 1);
    const count = this.count ? total : null;
    if (this.head) return { data: null, error: null, count };

    const data = paged.map((r) => this.project(r, this.sel, this.table));
    if (this.one === "single") {
      if (data.length !== 1)
        return { data: null, error: { message: "JSON object requested, multiple (or no) rows returned" }, count };
      return { data: data[0], error: null, count };
    }
    if (this.one === "maybe") {
      if (data.length > 1)
        return { data: null, error: { message: "JSON object requested, multiple (or no) rows returned" }, count };
      return { data: data[0] ?? null, error: null, count };
    }
    return { data, error: null, count };
  }

  then<R1 = unknown, R2 = never>(
    onF?: ((v: unknown) => R1 | PromiseLike<R1>) | null,
    onR?: ((e: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    // 지원하지 않는 질의는 거부된 프로미스로 드러낸다.
    return new Promise((res) => res(this.run())).then(onF, onR);
  }
}

function rpc(db: DemoData, name: string, args: Row = {}) {
  if (WRITE_RPC.has(name)) return { data: null, error: demoError() };

  const total = (itemId: unknown) =>
    db.stock.filter((s) => s.item_id === itemId).reduce((n, s) => n + s.qty, 0);

  if (name === "low_stock_items") {
    const data = db.items
      .filter((i) => i.active && i.min_qty > 0 && total(i.id) < i.min_qty)
      .map((i) => ({
        item_id: i.id,
        sku: i.sku,
        name: i.name,
        unit: i.unit,
        total_qty: total(i.id),
        min_qty: i.min_qty,
        shortage: i.min_qty - total(i.id),
      }))
      .sort((a, b) => b.shortage - a.shortage || cmp(a.sku, b.sku));
    return { data, error: null };
  }

  if (name === "search_items") {
    const q = String(args.q ?? "").trim().toLowerCase();
    const lim = Math.min(Math.max(Number(args.lim ?? 50), 1), 200);
    const off = Math.max(Number(args.off ?? 0), 0);
    const exact = (i: Row) => [i.sku, i.barcode].some((v) => String(v ?? "").toLowerCase() === q);
    const hit = (i: Row) =>
      [i.sku, i.name, i.barcode].some((v) => String(v ?? "").toLowerCase().includes(q));
    const data = db.items
      .filter((i) => (args.include_archived || i.active) && (!q || hit(i)))
      .sort(
        (a, b) =>
          (q ? Number(!exact(a)) - Number(!exact(b)) : 0) ||
          cmp(a.name.toLowerCase(), b.name.toLowerCase()) ||
          cmp(a.id, b.id),
      )
      .slice(off, off + lim)
      .map((i) => ({ ...i, total_qty: total(i.id) }));
    return { data, error: null };
  }

  throw new Error(`데모 클라이언트가 지원하지 않는 rpc: ${name}`);
}

export function createDemoClient(): SupabaseClient<Database> {
  const db = buildDemoData();
  const client = {
    from(table: string) {
      if (!(table in db)) throw new Error(`데모 클라이언트가 지원하지 않는 테이블: ${table}`);
      return new Query(db, table as Table);
    },
    rpc: (name: string, args?: Row) => new Promise((res) => res(rpc(db, name, args))),
    auth: {
      getUser: async () => ({
        data: { user: { id: DEMO_USER_ID, email: DEMO_USER_EMAIL } },
        error: null,
      }),
      signOut: async () => ({ error: null }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: demoError() }),
      updateUser: async () => ({ data: { user: null }, error: demoError() }),
    },
    storage: {
      from: () => ({
        // 데모 품목에는 사진이 없다. 업로드 정보 조회는 쓰기 경로라 막는다.
        createSignedUrl: async () => ({ data: null, error: null }),
        info: async () => ({ data: null, error: demoError() }),
      }),
    },
  };
  return client as unknown as SupabaseClient<Database>;
}
