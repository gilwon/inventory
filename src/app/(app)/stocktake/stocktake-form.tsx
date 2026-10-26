"use client";
// 실사 입력 폼 (행마다 실제 수량 입력, 장부와 다른 행만 사유 입력 후 일괄 제출)

import { useMemo, useState, useTransition } from "react";
import { formatQty } from "@/lib/format";
import { collectChangedRows, MAX_ROWS, type EntryInput } from "@/lib/stocktake";
import { btnPrimary, cardCls, errCls, inputCls } from "../items/common";
import { submitStocktake } from "./actions";

type Item = { id: string; sku: string; name: string; unit: string; qty: number };

export function StocktakeForm({
  locationId,
  items,
}: {
  locationId: string;
  items: Item[];
}) {
  const [inputs, setInputs] = useState<Record<string, EntryInput>>({});
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const result = useMemo(() => collectChangedRows(items, inputs), [items, inputs]);

  function set(id: string, patch: Partial<EntryInput>) {
    setDone(null);
    setError(null);
    setInputs((prev) => {
      const cur = prev[id] ?? { actual: "", reason: "" };
      return { ...prev, [id]: { ...cur, ...patch } };
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    setDone(null);
    if (result.error) return setError(result.error);
    if (Object.keys(result.errors).length > 0) {
      return setError("빨간 안내가 있는 행을 확인해 주세요.");
    }
    if (result.rows.length === 0) return;
    setError(null);
    startTransition(async () => {
      const r = await submitStocktake(locationId, result.rows);
      if (r.ok) {
        setInputs({});
        setTried(false);
        setDone(r.changed);
      } else {
        setError(r.error);
      }
    });
  }

  if (items.length === 0) {
    return (
      <p className={`${cardCls} text-sm text-ink-2`}>
        이 위치에 재고가 있는 품목이 없습니다.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <p className="text-sm text-ink-2">
        실제 수량을 입력한 행만 반영합니다. 비워 두면 건드리지 않고, 장부와 다르게
        입력하면 사유가 필요합니다. 한 번에 최대 {MAX_ROWS}건까지 조정합니다.
      </p>
      <ul className="space-y-2">
        {items.map((it) => {
          const input = inputs[it.id];
          const rowErr = result.errors[it.id];
          const differs =
            input?.actual.trim() !== "" &&
            /^\d+$/.test(input?.actual.trim() ?? "") &&
            Number(input?.actual) !== it.qty;
          return (
            <li key={it.id} className={cardCls}>
              <div className="grid gap-2 md:grid-cols-[1fr_auto_10rem] md:items-center md:gap-4">
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium">{it.name}</p>
                  <p className="break-all text-xs text-ink-2">{it.sku}</p>
                </div>
                <p className="text-sm">
                  <span className="text-ink-2">장부 </span>
                  <span className="font-medium tabular-nums">
                    {formatQty(it.qty, it.unit)}
                  </span>
                </p>
                <div>
                  <label htmlFor={`a-${it.id}`} className="block text-xs text-ink-2">
                    {it.sku} 실제 수량
                  </label>
                  <input
                    id={`a-${it.id}`}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={input?.actual ?? ""}
                    onChange={(e) => set(it.id, { actual: e.target.value })}
                    aria-invalid={rowErr?.qty ? true : undefined}
                    className={inputCls}
                  />
                </div>
              </div>
              {rowErr?.qty && (
                <p role="alert" className={`${errCls} mt-2`}>
                  {rowErr.qty}
                </p>
              )}
              {differs && (
                <div className="mt-2">
                  <label htmlFor={`r-${it.id}`} className="block text-xs text-ink-2">
                    {it.sku} 조정 사유 (필수)
                  </label>
                  <input
                    id={`r-${it.id}`}
                    type="text"
                    autoComplete="off"
                    maxLength={200}
                    value={input?.reason ?? ""}
                    onChange={(e) => set(it.id, { reason: e.target.value })}
                    aria-invalid={tried && rowErr?.reason ? true : undefined}
                    className={inputCls}
                  />
                  {tried && rowErr?.reason && (
                    <p role="alert" className={`${errCls} mt-1`}>
                      {rowErr.reason}
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="space-y-2">
        {error && (
          <p role="alert" className={errCls}>
            {error}
          </p>
        )}
        {done !== null && (
          <p role="status" className="text-sm font-medium text-ink">
            ✓ {done}건을 조정했습니다
          </p>
        )}
        {result.changed === 0 && (
          <p className="text-sm text-ink-2">
            장부와 다른 수량을 입력한 행이 없어 제출할 수 없습니다.
          </p>
        )}
        <button
          type="submit"
          disabled={pending || result.changed === 0}
          className={`${btnPrimary} w-full sm:w-auto`}
        >
          {pending ? "처리 중" : `실사 반영 (${result.changed}건)`}
        </button>
      </div>
    </form>
  );
}
