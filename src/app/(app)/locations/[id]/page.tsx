// 위치 상세 화면 (품목별 수량, 하위 위치 링크, 수정, 보관/복원)
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/lucian/skeleton";
import { getRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatQty } from "@/lib/format";
import { buildLocationPaths } from "@/lib/location-path";
import { ActiveToggle } from "../../items/active-toggle";
import { badgeCls, cardCls, isUuid, linkCls } from "../../items/common";
import { setLocationActive } from "../actions";
import { LocationForm } from "../location-form";

async function LocationDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const isAdmin = (await getRole()) === "admin";
  const supabase = await createClient();
  const [locRes, stockRes] = await Promise.all([
    supabase.from("locations").select("id, parent_id, code, name, active"),
    supabase
      .from("stock")
      .select("qty, items(id, sku, name, unit)")
      .eq("location_id", id)
      .gt("qty", 0),
  ]);
  const locs = locRes.data ?? [];
  const loc = locs.find((l) => l.id === id);
  if (!loc) notFound();

  const paths = buildLocationPaths(locs);
  const children = locs
    .filter((l) => l.parent_id === id)
    .sort((a, b) => a.code.localeCompare(b.code, "ko"));

  // 자기 자신과 모든 후손은 상위 선택지에서 뺀다.
  const banned = new Set([id]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const l of locs) {
      if (l.parent_id && banned.has(l.parent_id) && !banned.has(l.id)) {
        banned.add(l.id);
        grew = true;
      }
    }
  }
  const options = locs
    .filter((l) => !banned.has(l.id) && (l.active || l.id === loc.parent_id))
    .map((l) => ({ id: l.id, label: paths.get(l.id) ?? l.name }))
    .sort((a, b) => a.label.localeCompare(b.label, "ko"));

  const stock = (stockRes.data ?? [])
    .flatMap((s) => (s.items ? [{ qty: s.qty, item: s.items }] : []))
    .sort((a, b) => a.item.name.localeCompare(b.item.name, "ko"));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <Link href="/locations" className={`${linkCls} inline-flex min-h-11 items-center`}>
          위치 목록
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="min-w-0 break-words text-xl font-bold">{loc.name}</h1>
          {!loc.active && <span className={badgeCls}>보관됨</span>}
        </div>
        <p className="break-words text-sm text-ink-2">
          {loc.code} · {paths.get(loc.id)}
        </p>
      </div>

      <section aria-labelledby="stock-h" className={`${cardCls} space-y-3`}>
        <h2 id="stock-h" className="font-bold">
          품목별 수량
        </h2>
        {stock.length === 0 ? (
          <p className="text-sm">이 위치에 수량이 있는 품목이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-line">
            {stock.map(({ qty, item }) => (
              <li key={item.id} className="flex items-center justify-between gap-3">
                <Link href={`/items/${item.id}`} className={`${linkCls} inline-flex min-h-11 items-center min-w-0 break-words`}>
                  {item.name} ({item.sku})
                </Link>
                <span className="shrink-0">{formatQty(qty, item.unit)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="child-h" className={`${cardCls} space-y-3`}>
        <h2 id="child-h" className="font-bold">
          하위 위치
        </h2>
        {children.length === 0 ? (
          <p className="text-sm">하위 위치가 없습니다.</p>
        ) : (
          <ul className="space-y-1">
            {children.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <Link href={`/locations/${c.id}`} className={`${linkCls} inline-flex min-h-11 items-center min-w-0 break-words`}>
                  {c.name} ({c.code})
                </Link>
                {!c.active && <span className={badgeCls}>보관</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {isAdmin && (
      <>
      <section aria-labelledby="edit-h" className="space-y-3">
        <h2 id="edit-h" className="font-bold">
          위치 정보 수정
        </h2>
        <LocationForm location={loc} options={options} />
      </section>

      <section aria-labelledby="archive-h" className={`${cardCls} space-y-2`}>
        <h2 id="archive-h" className="font-bold">
          {loc.active ? "보관" : "복원"}
        </h2>
        <p className="text-sm">
          {loc.active
            ? "보관하면 새 입력의 선택지에서 빠집니다. 수량이 남아 있거나 활성 하위 위치가 있으면 보관할 수 없습니다."
            : "복원하면 다시 입력에 쓸 수 있습니다."}
        </p>
        <ActiveToggle action={setLocationActive} id={loc.id} active={loc.active} />
      </section>
      </>
      )}
    </div>
  );
}

// 데이터 조회는 Suspense 안에서 해서 화면 이동이 막히지 않게 한다.
export default function LocationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <LocationDetailContent params={params} />
    </Suspense>
  );
}
