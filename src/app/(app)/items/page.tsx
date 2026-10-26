// 품목 목록 화면 (검색, 보관 포함 필터, 50건 페이지네이션)
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";
import { formatQty } from "@/lib/format";
import { badgeCls, btnPrimary, btnSecondary, cardCls, errCls, focusRing, inputCls } from "./common";

const PAGE_SIZE = 50;

type ItemRow = Pick<Tables<"items">, "id" | "sku" | "name" | "unit" | "active"> & {
  total_qty: number;
};

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const q = first(sp.q).trim().slice(0, 100);
  const archived = first(sp.archived) === "1";
  const pageNum = Math.min(Math.max(parseInt(first(sp.page), 10) || 1, 1), 10000);

  const supabase = await createClient();
  // 검색어는 RPC 파라미터로만 넘긴다. 다음 페이지 유무는 1건 더 요청해 판단한다.
  const { data, error } = await supabase.rpc("search_items", {
    q,
    lim: PAGE_SIZE + 1,
    off: (pageNum - 1) * PAGE_SIZE,
    include_archived: archived,
  });
  // 클라이언트에 DB 제네릭이 없어 RPC 반환이 any 이므로 사용하는 열만 타입을 지정한다.
  const all = (data ?? []) as ItemRow[];
  const rows = all.slice(0, PAGE_SIZE);
  const hasNext = all.length > PAGE_SIZE;

  const href = (page: number) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (archived) p.set("archived", "1");
    if (page > 1) p.set("page", String(page));
    const s = p.toString();
    return s ? `/items?${s}` : "/items";
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">품목</h1>
        <Link href="/items/new" className={btnPrimary}>
          새 품목
        </Link>
      </div>

      <form action="/items" method="get" role="search" className="space-y-2">
        <label htmlFor="q" className="block text-sm font-medium">
          SKU, 이름, 바코드 검색
        </label>
        <div className="flex gap-2">
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            maxLength={100}
            autoComplete="off"
            className={inputCls}
          />
          <button type="submit" className={btnSecondary}>
            검색
          </button>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="archived"
            value="1"
            defaultChecked={archived}
            className="size-5"
          />
          보관 포함
        </label>
      </form>

      {error && (
        <p role="alert" className={errCls}>
          품목을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      )}

      {!error && rows.length === 0 && (
        <p className={`${cardCls} text-sm`}>
          {q ? "검색 결과가 없습니다." : "등록된 품목이 없습니다."}
        </p>
      )}

      {rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/items/${r.id}`}
                className={`${cardCls} flex items-start justify-between gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 ${focusRing}`}
              >
                <span className="min-w-0">
                  <span className="block break-words font-medium">{r.name}</span>
                  <span className="block break-all text-sm text-zinc-700 dark:text-zinc-300">
                    {r.sku}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-medium">
                    {formatQty(Number(r.total_qty), r.unit)}
                  </span>
                  {!r.active && <span className={badgeCls}>보관</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {(pageNum > 1 || hasNext) && (
        <nav aria-label="페이지 이동" className="flex items-center justify-between gap-3">
          {pageNum > 1 ? (
            <Link href={href(pageNum - 1)} className={btnSecondary}>
              이전
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm">{pageNum} 페이지</span>
          {hasNext ? (
            <Link href={href(pageNum + 1)} className={btnSecondary}>
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
