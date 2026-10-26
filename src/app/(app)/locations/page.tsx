// 위치 목록 화면 (들여쓰기 트리, 코드 검색, 새 위치 만들기)
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buildLocationPaths } from "@/lib/location-path";
import {
  badgeCls,
  btnSecondary,
  cardCls,
  errCls,
  focusRing,
  inputCls,
} from "../items/common";
import { LocationForm } from "./location-form";

type Loc = {
  id: string;
  parent_id: string | null;
  code: string;
  name: string;
  active: boolean;
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

// 상위부터 깊이 우선으로 펼친다. 순환 데이터가 있어도 방문 표시로 멈춘다.
function flatten(locs: Loc[]): { loc: Loc; depth: number }[] {
  const ids = new Set(locs.map((l) => l.id));
  const kids = new Map<string | null, Loc[]>();
  for (const l of locs) {
    // 상위가 목록에 없으면 최상위로 취급한다.
    const key = l.parent_id && ids.has(l.parent_id) ? l.parent_id : null;
    kids.set(key, [...(kids.get(key) ?? []), l]);
  }
  const out: { loc: Loc; depth: number }[] = [];
  const seen = new Set<string>();
  const walk = (parent: string | null, depth: number) => {
    const list = (kids.get(parent) ?? []).sort((a, b) =>
      a.code.localeCompare(b.code, "ko"),
    );
    for (const l of list) {
      if (seen.has(l.id)) continue;
      seen.add(l.id);
      out.push({ loc: l, depth });
      walk(l.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = first(sp.q).trim().slice(0, 50);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("locations")
    .select("id, parent_id, code, name, active");
  const locs: Loc[] = data ?? [];
  const paths = buildLocationPaths(locs);

  // 코드 검색은 전체 목록에서 걸러 낸다(쿼리 문자열을 만들지 않는다).
  const needle = q.toLowerCase();
  const rows = needle
    ? locs
        .filter((l) => l.code.toLowerCase().includes(needle))
        .sort((a, b) => a.code.localeCompare(b.code, "ko"))
        .map((loc) => ({ loc, depth: 0 }))
    : flatten(locs);

  const parentOptions = locs
    .filter((l) => l.active)
    .map((l) => ({ id: l.id, label: paths.get(l.id) ?? l.name }))
    .sort((a, b) => a.label.localeCompare(b.label, "ko"));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-bold">위치</h1>

      <form action="/locations" method="get" role="search" className="space-y-2">
        <label htmlFor="q" className="block text-sm font-medium">
          코드 검색
        </label>
        <div className="flex gap-2">
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            maxLength={50}
            autoComplete="off"
            className={inputCls}
          />
          <button type="submit" className={btnSecondary}>
            검색
          </button>
        </div>
      </form>

      <details className={cardCls}>
        <summary className={`min-h-11 cursor-pointer py-2 font-medium ${focusRing}`}>
          새 위치 만들기
        </summary>
        <div className="pt-3">
          <LocationForm options={parentOptions} />
        </div>
      </details>

      {error && (
        <p role="alert" className={errCls}>
          위치를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      )}
      {!error && rows.length === 0 && (
        <p className={`${cardCls} text-sm`}>
          {q ? "검색 결과가 없습니다." : "등록된 위치가 없습니다."}
        </p>
      )}

      {rows.length > 0 && (
        <ul className="space-y-1">
          {rows.map(({ loc, depth }) => (
            <li key={loc.id} style={{ paddingLeft: `${Math.min(depth, 6) * 16}px` }}>
              <Link
                href={`/locations/${loc.id}`}
                className={`${cardCls} flex min-h-11 items-center justify-between gap-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 ${focusRing}`}
              >
                <span className="min-w-0">
                  <span className="block break-words font-medium">{loc.name}</span>
                  <span className="block break-all text-sm text-zinc-700 dark:text-zinc-300">
                    {needle ? `${loc.code} · ${paths.get(loc.id)}` : loc.code}
                  </span>
                </span>
                {!loc.active && <span className={badgeCls}>보관</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
