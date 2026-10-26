// 이력 목록 화면 (필터는 URL로 유지, 50건 페이지네이션, 이동 묶음 표시, 정정 버튼)
import Link from "next/link";
import { Suspense } from "react";
import { DateRange } from "@/components/lucian/date-range";
import { EmptyState } from "@/components/lucian/empty-state";
import { InlineAlert } from "@/components/lucian/inline-alert";
import { ListSkeleton } from "@/components/lucian/skeleton";
import { formatKst, formatQty } from "@/lib/format";
import { buildLocationPaths } from "@/lib/location-path";
import { createClient } from "@/lib/supabase/server";
import { ReverseButton } from "./reverse-button";

const PAGE_SIZE = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// 형식뿐 아니라 실제 달력에 있는 날짜인지 확인한다 (예 2026-13-99 거절).
function isRealDate(s: string): boolean {
  return DATE.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
}

const TYPE_FILTERS = [
  { value: "receive", label: "입고" },
  { value: "issue", label: "출고" },
  { value: "transfer", label: "이동" },
  { value: "adjust", label: "조정" },
  { value: "reverse", label: "정정" },
  { value: "import", label: "가져오기" },
];

const SELECT =
  "id,type,delta,reason,group_id,reverses_id,created_at,location_id,items(sku,name,unit),profiles(display_name)";

type Row = {
  id: number;
  type: string;
  delta: number;
  reason: string | null;
  group_id: string | null;
  reverses_id: number | null;
  created_at: string;
  location_id: string;
  items: { sku: string; name: string; unit: string } | null;
  profiles: { display_name: string | null } | null;
};

type Entry = { key: string; row: Row; out?: Row; in?: Row; reversed: boolean };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const focus =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";
const field = `block min-h-11 w-full min-w-0 rounded-xl border border-ink-3 bg-surface px-3 py-2 text-base text-ink ${focus}`;

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

function typeLabel(r: Row): string {
  if (r.type === "adjust") return r.reverses_id ? "정정" : "조정";
  return (
    { receive: "입고", issue: "출고", transfer_out: "이동", transfer_in: "이동", import: "가져오기" }[
      r.type
    ] ?? r.type
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <InlineAlert>{children}</InlineAlert>
  );
}

async function HistoryContent({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const from = isRealDate(first(sp.from)) ? first(sp.from) : "";
  const to = isRealDate(first(sp.to)) ? first(sp.to) : "";
  const q = first(sp.q).slice(0, 100);
  const loc = UUID.test(first(sp.loc)) ? first(sp.loc) : "";
  const type = TYPE_FILTERS.some((t) => t.value === first(sp.type)) ? first(sp.type) : "";
  const user = UUID.test(first(sp.user)) ? first(sp.user) : "";
  const pageNum = Math.min(Math.max(parseInt(first(sp.page), 10) || 1, 1), 10000);

  const supabase = await createClient();
  const [locRes, userRes] = await Promise.all([
    supabase.from("locations").select("id,parent_id,name"),
    supabase.from("profiles").select("id,display_name"),
  ]);
  const paths = buildLocationPaths(locRes.data ?? []);
  const locOptions = [...paths.entries()].sort((a, b) => a[1].localeCompare(b[1], "ko"));
  const users = userRes.data ?? [];

  // 품목 검색어는 search_items RPC 파라미터로만 보낸다.
  let itemIds: string[] | null = null;
  if (q) {
    const { data } = await supabase.rpc("search_items", {
      q,
      lim: 200,
      off: 0,
      include_archived: true,
    });
    itemIds = (data ?? []).map((r) => r.id);
  }

  let rows: Row[] = [];
  let hasNext = false;
  let errorMessage: string | null = null;

  if (!itemIds || itemIds.length > 0) {
    const offset = (pageNum - 1) * PAGE_SIZE;
    let query = supabase
      .from("movements")
      .select(SELECT)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + PAGE_SIZE);
    // 기간은 KST 기준 날짜 경계로 자른다.
    if (from) query = query.gte("created_at", `${from}T00:00:00+09:00`);
    if (to) query = query.lte("created_at", `${to}T23:59:59.999+09:00`);
    if (itemIds) query = query.in("item_id", itemIds);
    if (loc) query = query.eq("location_id", loc);
    if (user) query = query.eq("created_by", user);
    if (type === "transfer") query = query.in("type", ["transfer_out", "transfer_in"]);
    else if (type === "adjust") query = query.eq("type", "adjust").is("reverses_id", null);
    else if (type === "reverse") query = query.eq("type", "adjust").not("reverses_id", "is", null);
    else if (type) query = query.eq("type", type);

    const { data, error } = await query;
    // DB 오류 문구는 화면에 노출하지 않는다.
    if (error) errorMessage = "잠시 후 다시 시도해 주세요.";
    const got: Row[] = data ?? [];
    hasNext = got.length > PAGE_SIZE;
    rows = got.slice(0, PAGE_SIZE);
  }

  // 이동 묶음의 짝 행이 다른 쪽에 있을 수 있어 같은 묶음 행을 모두 가져온다.
  const groupIds = [...new Set(rows.filter((r) => r.group_id).map((r) => r.group_id as string))];
  const byId = new Map(rows.map((r) => [r.id, r]));
  if (groupIds.length > 0) {
    const { data } = await supabase.from("movements").select(SELECT).in("group_id", groupIds);
    for (const r of data ?? []) byId.set(r.id, r);
  }
  const groupRows = [...byId.values()].filter(
    (r) => r.group_id && groupIds.includes(r.group_id) && r.type.startsWith("transfer_"),
  );

  // 이미 정정된 원본을 찾는다 (다른 행의 reverses_id 가 가리키는 행).
  const reversedIds = new Set<number>();
  const checkIds = [...new Set([...rows.map((r) => r.id), ...groupRows.map((r) => r.id)])];
  if (checkIds.length > 0) {
    const { data } = await supabase.from("movements").select("reverses_id").in("reverses_id", checkIds);
    for (const r of data ?? []) if (r.reverses_id !== null) reversedIds.add(r.reverses_id);
  }

  const entries: Entry[] = [];
  const seenGroups = new Set<string>();
  for (const r of rows) {
    if (r.group_id && r.type.startsWith("transfer_")) {
      if (seenGroups.has(r.group_id)) continue;
      seenGroups.add(r.group_id);
      const members = groupRows.filter((g) => g.group_id === r.group_id);
      const out = members.find((m) => m.type === "transfer_out");
      const inn = members.find((m) => m.type === "transfer_in");
      entries.push({
        key: r.group_id,
        row: out ?? inn ?? r,
        out,
        in: inn,
        reversed: members.some((m) => reversedIds.has(m.id)),
      });
    } else {
      entries.push({ key: String(r.id), row: r, reversed: reversedIds.has(r.id) });
    }
  }

  const base = new URLSearchParams();
  for (const [k, v] of Object.entries({ from, to, q, loc, type, user })) if (v) base.set(k, v);
  const pageHref = (p: number) => {
    const s = new URLSearchParams(base);
    if (p > 1) s.set("page", String(p));
    const text = s.toString();
    return text ? `/history?${text}` : "/history";
  };

  return (
    <div className="space-y-4">
      <form
        method="get"
        action="/history"
        className="grid grid-cols-1 gap-3 rounded-2xl border border-line bg-surface p-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        <div className="col-span-full">
          <DateRange key={`${from}~${to}`} from={from} to={to} />
        </div>
        <div className="space-y-1">
          <label htmlFor="f-q" className="block text-sm font-medium">품목 (SKU, 이름, 바코드)</label>
          <input id="f-q" name="q" type="search" defaultValue={q} autoComplete="off" className={field} />
        </div>
        <div className="space-y-1">
          <label htmlFor="f-loc" className="block text-sm font-medium">위치</label>
          <select id="f-loc" name="loc" defaultValue={loc} className={field}>
            <option value="">전체</option>
            {locOptions.map(([id, path]) => (
              <option key={id} value={id}>{path}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="f-type" className="block text-sm font-medium">유형</label>
          <select id="f-type" name="type" defaultValue={type} className={field}>
            <option value="">전체</option>
            {TYPE_FILTERS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="f-user" className="block text-sm font-medium">작업자</label>
          <select id="f-user" name="user" defaultValue={user} className={field}>
            <option value="">전체</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.display_name ?? "알 수 없음"}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
          <button
            type="submit"
            className="min-h-11 rounded-xl bg-accent px-5 text-base font-medium text-accent-ink hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            조회
          </button>
          <Link
            href="/history"
            className={`flex min-h-11 items-center rounded-xl border border-ink-3 px-5 text-base font-medium text-ink hover:bg-surface-2 ${focus}`}
          >
            초기화
          </Link>
        </div>
      </form>

      {errorMessage && <ErrorText>이력을 불러오지 못했습니다. {errorMessage}</ErrorText>}
      {!errorMessage && entries.length === 0 && (
        <EmptyState
          title="조건에 맞는 이력이 없습니다"
          description="기간이나 검색 조건을 바꿔 보세요."
        />
      )}
      {q && itemIds && itemIds.length >= 200 && (
        <p className="text-sm text-ink-2">
          검색된 품목이 많아 일부만 조회했습니다. 검색어를 더 구체적으로 입력해 주세요.
        </p>
      )}

      <ul className="space-y-2">
        {entries.map((e) => {
          const r = e.row;
          const isTransfer = Boolean(e.out || e.in);
          const delta = isTransfer ? Math.abs(r.delta) : r.delta;
          const canReverse = !r.reverses_id && !e.reversed;
          return (
            <li
              key={e.key}
              className="grid gap-x-4 gap-y-1 rounded-2xl border border-line bg-surface p-3 text-sm md:grid-cols-[9rem_5rem_1fr_6rem_auto] md:items-center"
            >
              <p className="text-ink-2">{formatKst(r.created_at)}</p>
              <p className="font-semibold">{typeLabel(r)}</p>
              <div className="min-w-0">
                <p className="break-words font-medium">
                  {r.items ? `${r.items.sku} ${r.items.name}` : "알 수 없는 품목"}
                </p>
                <p className="break-words text-ink-2">
                  {isTransfer
                    ? `${e.out ? paths.get(e.out.location_id) ?? "" : "?"} > ${e.in ? paths.get(e.in.location_id) ?? "" : "?"}`
                    : paths.get(r.location_id) ?? ""}
                </p>
                {r.reason && (
                  <p className="break-words text-ink-2">사유 {r.reason}</p>
                )}
                <p className="text-ink-2">
                  작업자 {r.profiles?.display_name ?? "알 수 없음"}
                </p>
              </div>
              <p className="font-semibold tabular-nums md:text-right">
                {isTransfer ? "" : delta > 0 ? "+" : "-"}
                {formatQty(Math.abs(delta), r.items?.unit)}
              </p>
              <div>
                {canReverse ? (
                  <ReverseButton movementId={(e.out ?? r).id} />
                ) : e.reversed ? (
                  <span className="inline-block rounded-md border border-line-2 bg-surface-2 px-2 py-1 text-xs font-medium text-ink">
                    정정됨
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {(pageNum > 1 || hasNext) && (
        <nav aria-label="페이지 이동" className="flex items-center justify-between gap-2">
          {pageNum > 1 ? (
            <Link
              href={pageHref(pageNum - 1)}
              className={`flex min-h-11 items-center rounded-xl border border-ink-3 px-5 font-medium hover:bg-surface-2 ${focus}`}
            >
              이전
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-ink-2">{pageNum}쪽</span>
          {hasNext ? (
            <Link
              href={pageHref(pageNum + 1)}
              className={`flex min-h-11 items-center rounded-xl border border-ink-3 px-5 font-medium hover:bg-surface-2 ${focus}`}
            >
              다음
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

export default function HistoryPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="text-xl font-bold">이력</h1>
      <Suspense fallback={<ListSkeleton />}>
        <HistoryContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
