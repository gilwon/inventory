// 대시보드용 부족 품목 목록 (low_stock_items RPC, 모바일은 카드형, md 이상은 표)
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { cardCls, errCls, linkCls } from "./items/common";

export async function LowStockCard() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("low_stock_items");
  const rows = data ?? [];

  return (
    <section className={`${cardCls} space-y-3`} aria-labelledby="low-stock-title">
      <h2 id="low-stock-title" className="text-base font-bold">
        부족 품목
      </h2>
      {error ? (
        <p role="alert" className={errCls}>
          부족 품목을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-ink-2">부족한 품목이 없습니다</p>
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {rows.map((r) => (
              <li key={r.item_id} className="rounded-xl border border-line p-3">
                <Link href={`/items/${r.item_id}`} className={`${linkCls} block min-h-11 break-words`}>
                  {r.name}
                </Link>
                <p className="break-all text-xs text-ink-2">{r.sku}</p>
                <p className="mt-1 text-sm tabular-nums">
                  현재 {r.total_qty.toLocaleString("ko-KR")} / 최소{" "}
                  {r.min_qty.toLocaleString("ko-KR")} {r.unit}
                  <span className="font-medium text-danger">
                    {" "}
                    (부족 {r.shortage.toLocaleString("ko-KR")})
                  </span>
                </p>
              </li>
            ))}
          </ul>
          <table className="hidden w-full text-sm md:table">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-2">
                <th scope="col" className="py-2 pr-3 font-medium">SKU</th>
                <th scope="col" className="py-2 pr-3 font-medium">품목</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">현재 합계</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">최소 수량</th>
                <th scope="col" className="py-2 text-right font-medium">부족분</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.item_id} className="border-b border-line last:border-0">
                  <td className="py-2 pr-3 break-all">{r.sku}</td>
                  <td className="py-2 pr-3">
                    <Link href={`/items/${r.item_id}`} className={`${linkCls} inline-flex min-h-11 items-center`}>
                      {r.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {r.total_qty.toLocaleString("ko-KR")} {r.unit}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {r.min_qty.toLocaleString("ko-KR")} {r.unit}
                  </td>
                  <td className="py-2 text-right font-medium tabular-nums text-danger">
                    {r.shortage.toLocaleString("ko-KR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
