// 품목 상세 화면 (수정 폼, 위치별 수량, 최근 이력 20건, 보관/복원)
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { formatKst, formatQty } from "@/lib/format";
import { buildLocationPaths } from "@/lib/location-path";
import { ActiveToggle } from "../active-toggle";
import { setItemActive } from "../actions";
import { badgeCls, cardCls, isUuid, linkCls } from "../common";
import { ItemForm } from "../item-form";

const TYPE_LABEL: Record<string, string> = {
  receive: "입고",
  issue: "출고",
  transfer_out: "이동 출고",
  transfer_in: "이동 입고",
  adjust: "조정",
  import: "가져오기",
};

async function ItemDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const [itemRes, stockRes, locRes, moveRes] = await Promise.all([
    supabase.from("items").select("*").eq("id", id).maybeSingle(),
    supabase.from("stock").select("location_id, qty").eq("item_id", id).gt("qty", 0),
    supabase.from("locations").select("id, parent_id, name"),
    supabase
      .from("movements")
      .select("id, type, delta, reason, created_at, location_id, reverses_id")
      .eq("item_id", id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(20),
  ]);
  const item = itemRes.data;
  if (!item) notFound();

  const paths = buildLocationPaths(locRes.data ?? []);
  const stock = [...(stockRes.data ?? [])]
    .map((s) => ({ ...s, path: paths.get(s.location_id) ?? "(알 수 없는 위치)" }))
    .sort((a, b) => a.path.localeCompare(b.path, "ko"));
  const total = stock.reduce((n, s) => n + s.qty, 0);

  // 사진은 비공개 버킷이라 서버에서 서명 URL 을 만든다.
  let photoUrl: string | null = null;
  if (item.photo_path) {
    const { data } = await supabase.storage
      .from("item-photos")
      .createSignedUrl(item.photo_path, 3600);
    photoUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <Link href="/items" className={`${linkCls} inline-flex min-h-11 items-center`}>
          품목 목록
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="min-w-0 break-words text-xl font-bold">{item.name}</h1>
          {!item.active && <span className={badgeCls}>보관됨</span>}
        </div>
        <p className="break-all text-sm text-ink-2">
          {item.sku}
        </p>
      </div>

      <section aria-labelledby="stock-h" className={`${cardCls} space-y-3`}>
        <h2 id="stock-h" className="font-bold">
          위치별 수량
        </h2>
        {stock.length === 0 ? (
          <p className="text-sm">수량이 있는 위치가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-line">
            {stock.map((s) => (
              <li key={s.location_id} className="flex items-center justify-between gap-3">
                <Link href={`/locations/${s.location_id}`} className={`${linkCls} inline-flex min-h-11 items-center min-w-0 break-words`}>
                  {s.path}
                </Link>
                <span className="shrink-0">{formatQty(s.qty, item.unit)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="flex justify-between border-t border-line pt-2 font-bold">
          <span>합계</span>
          <span>{formatQty(total, item.unit)}</span>
        </p>
      </section>

      <section aria-labelledby="edit-h" className="space-y-3">
        <h2 id="edit-h" className="font-bold">
          품목 정보 수정
        </h2>
        <ItemForm item={item} photoUrl={photoUrl} />
      </section>

      <section aria-labelledby="archive-h" className={`${cardCls} space-y-2`}>
        <h2 id="archive-h" className="font-bold">
          {item.active ? "보관" : "복원"}
        </h2>
        <p className="text-sm">
          {item.active
            ? "보관하면 새 입력의 선택지에서 빠집니다. 수량이 남아 있으면 보관할 수 없습니다."
            : "복원하면 다시 입력에 쓸 수 있습니다."}
        </p>
        <ActiveToggle action={setItemActive} id={item.id} active={item.active} />
      </section>

      <section aria-labelledby="hist-h" className={`${cardCls} space-y-3`}>
        <h2 id="hist-h" className="font-bold">
          최근 이력 20건
        </h2>
        {(moveRes.data ?? []).length === 0 ? (
          <p className="text-sm">이력이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-line">
            {(moveRes.data ?? []).map((m) => (
              <li key={m.id} className="space-y-0.5 py-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span>
                    {TYPE_LABEL[m.type] ?? m.type}
                    {m.reverses_id != null && " (정정)"}
                  </span>
                  <span className="shrink-0 font-medium">
                    {m.delta > 0 ? "+" : ""}
                    {formatQty(m.delta, item.unit)}
                  </span>
                </div>
                <p className="break-words text-ink-2">
                  {formatKst(m.created_at)} · {paths.get(m.location_id) ?? ""}
                  {m.reason ? ` · ${m.reason}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// 데이터 조회는 Suspense 안에서 해서 화면 이동이 막히지 않게 한다.
export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-ink-2">불러오는 중...</p>}>
      <ItemDetailContent params={params} />
    </Suspense>
  );
}
