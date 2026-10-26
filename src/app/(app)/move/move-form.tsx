"use client";
// 입고·출고·이동·조정 탭 입력 폼 (품목 검색, 위치 선택, 현재 수량 안내)

import { useEffect, useRef, useState, useTransition } from "react";
import { formatQty } from "@/lib/format";
import {
  getStockAction,
  searchItemsAction,
  submitMovement,
  type ItemHit,
  type MoveInput,
} from "./actions";

type Loc = { id: string; path: string };
type Tab = MoveInput["type"];

const TABS: { type: Tab; label: string }[] = [
  { type: "receive", label: "입고" },
  { type: "issue", label: "출고" },
  { type: "transfer", label: "이동" },
  { type: "adjust", label: "조정" },
];

const MAX_QTY = 2147483647;

const focus =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";
// 모바일에서 입력 확대를 막으려고 글자 크기를 16px(text-base)로 둔다.
const field = `block min-h-12 w-full min-w-0 rounded-xl border border-ink-3 bg-surface px-3 py-2 text-base text-ink ${focus}`;
const label = "block text-sm font-medium";

export function MoveForm({ locations }: { locations: Loc[] }) {
  const [tab, setTab] = useState<Tab>("receive");
  const [item, setItem] = useState<ItemHit | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<{ q: string; items: ItemHit[] } | null>(null);
  const [locId, setLocId] = useState("");
  const [toLocId, setToLocId] = useState("");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [stock, setStock] = useState<{ key: string; qty: number | null } | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const qtyRef = useRef<HTMLInputElement>(null);

  const term = query.trim();

  // 품목 검색은 입력이 멈춘 뒤 300ms 후에 서버로 보낸다.
  useEffect(() => {
    if (!term) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchItemsAction(term).then((items) => {
        if (!cancelled) setHits({ q: term, items });
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term]);

  // 출고·이동·조정에서는 선택한 품목×위치의 현재 수량을 조회한다.
  const needStock = tab !== "receive";
  const stockKey = item && locId && needStock ? `${item.id}:${locId}:${refresh}` : "";
  useEffect(() => {
    if (!stockKey || !item) return;
    let cancelled = false;
    getStockAction(item.id, locId).then((q) => {
      if (!cancelled) setStock({ key: stockKey, qty: q });
    });
    return () => {
      cancelled = true;
    };
  }, [stockKey, item, locId]);

  const current = stockKey && stock?.key === stockKey ? stock.qty : undefined;
  const qtyNum = /^\d+$/.test(qty) && Number(qty) <= MAX_QTY ? Number(qty) : null;
  const over =
    (tab === "issue" || tab === "transfer") &&
    qtyNum !== null &&
    current !== undefined &&
    current !== null &&
    qtyNum > current;
  const unit = item?.unit ?? "";
  const pathOf = (id: string) => locations.find((l) => l.id === id)?.path ?? "";

  function changeTab(next: Tab) {
    setTab(next);
    setQty("");
    setReason("");
    setNotice(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return setNotice({ ok: false, text: "품목을 선택해 주세요." });
    if (!locId) return setNotice({ ok: false, text: "위치를 선택해 주세요." });
    if (tab === "transfer") {
      if (!toLocId) return setNotice({ ok: false, text: "도착 위치를 선택해 주세요." });
      if (toLocId === locId) {
        return setNotice({ ok: false, text: "출발 위치와 도착 위치가 같습니다." });
      }
    }
    if (qtyNum === null || (tab !== "adjust" && qtyNum < 1)) {
      return setNotice({
        ok: false,
        text: tab === "adjust" ? "수량은 0 이상의 정수로 입력해 주세요." : "수량은 1 이상의 정수로 입력해 주세요.",
      });
    }
    if (over) {
      return setNotice({ ok: false, text: "현재 수량보다 많이 입력했습니다." });
    }
    if (tab === "adjust" && !reason.trim()) {
      return setNotice({ ok: false, text: "조정 사유를 입력해 주세요." });
    }

    const input: MoveInput = {
      type: tab,
      itemId: item.id,
      locationId: locId,
      toLocationId: tab === "transfer" ? toLocId : undefined,
      qty,
      reason,
    };
    const tabLabel = TABS.find((t) => t.type === tab)?.label ?? "";
    const target = `${item.sku} ${item.name}, ${pathOf(locId)}${
      tab === "transfer" ? " > " + pathOf(toLocId) : ""
    }, ${formatQty(qtyNum, unit)}`;

    startTransition(async () => {
      const res = await submitMovement(input);
      if (!res.ok) return setNotice({ ok: false, text: res.error });
      setNotice({
        ok: true,
        text: res.unchanged
          ? "현재 수량과 같아 기록하지 않았습니다."
          : `${tabLabel}을 기록했습니다. ${target}`,
      });
      // 품목·위치는 유지하고 수량·사유만 비운다.
      setQty("");
      setReason("");
      setRefresh((n) => n + 1);
      qtyRef.current?.focus();
    });
  }

  function locationSelect(
    id: string,
    text: string,
    value: string,
    onChange: (v: string) => void,
  ) {
    return (
      <div className="space-y-1">
        <label htmlFor={id} className={label}>
          {text}
        </label>
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={field}
        >
          <option value="">위치 선택</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.path}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const shown = hits && hits.q === term ? hits.items : null;

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div role="group" aria-label="작업 유형" className="grid grid-cols-4 gap-1 rounded-2xl bg-surface-3 p-1">
        {TABS.map((t) => (
          <button
            key={t.type}
            type="button"
            aria-pressed={tab === t.type}
            onClick={() => changeTab(t.type)}
            className={`min-h-12 rounded-xl text-base font-medium text-ink aria-pressed:bg-accent aria-pressed:text-accent-ink hover:bg-surface-2 aria-pressed:hover:opacity-90 ${focus}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 품목 선택 */}
      {item ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-ink-3 bg-surface p-3">
          <div className="min-w-0">
            <p className="text-xs text-ink-2">품목</p>
            <p className="break-words font-medium">
              {item.sku} {item.name}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setItem(null);
              setQuery("");
              setNotice(null);
            }}
            className={`min-h-11 shrink-0 rounded-xl px-3 text-sm font-medium text-accent hover:bg-surface-2 ${focus}`}
          >
            변경
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          <label htmlFor="item-q" className={label}>
            품목 검색 (SKU, 이름, 바코드)
          </label>
          <input
            id="item-q"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            className={field}
          />
          <div aria-live="polite">
            {term && shown && shown.length === 0 && (
              <p className="text-sm text-ink-2">검색 결과가 없습니다.</p>
            )}
            {term && !shown && (
              <p className="text-sm text-ink-2">검색 중...</p>
            )}
          </div>
          {term && shown && shown.length > 0 && (
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-ink-3 bg-surface">
              {shown.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setItem(h);
                      setNotice(null);
                    }}
                    className={`flex min-h-12 w-full flex-col items-start px-3 py-2 text-left hover:bg-surface-2 ${focus}`}
                  >
                    <span className="break-words font-medium">
                      {h.sku} {h.name}
                    </span>
                    <span className="text-xs text-ink-2">
                      전체 {formatQty(h.total_qty, h.unit)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {locationSelect("loc", tab === "transfer" ? "출발 위치" : "위치", locId, (v) => {
        setLocId(v);
        setNotice(null);
      })}

      {tab !== "receive" && item && locId && (
        <p aria-live="polite" className="text-sm font-medium text-ink">
          현재 수량{" "}
          {current === undefined
            ? "확인 중..."
            : current === null
              ? "조회 실패"
              : formatQty(current, unit)}
        </p>
      )}

      {tab === "transfer" &&
        locationSelect("to-loc", "도착 위치", toLocId, (v) => {
          setToLocId(v);
          setNotice(null);
        })}

      <div className="space-y-1">
        <label htmlFor="qty" className={label}>
          {tab === "adjust" ? "실제 수량" : "수량"}
        </label>
        <input
          id="qty"
          ref={qtyRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={qty}
          onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))}
          aria-describedby="qty-hint"
          className={field}
        />
        <div id="qty-hint" aria-live="polite" className="text-sm">
          {over && (
            <p className="font-medium text-danger">
              현재 수량({formatQty(current as number, unit)})보다 많아 제출할 수 없습니다.
            </p>
          )}
          {tab === "adjust" && qtyNum !== null && typeof current === "number" && (
            <p className="text-ink-2">
              차이 {qtyNum - current > 0 ? "+" : ""}
              {formatQty(qtyNum - current)}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="reason" className={label}>
          {tab === "adjust" ? "사유 (필수)" : "사유 (선택)"}
        </label>
        <input
          id="reason"
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          autoComplete="off"
          className={field}
        />
      </div>

      {notice && (
        <p
          role={notice.ok ? "status" : "alert"}
          className={`rounded-xl border p-3 text-sm font-medium ${
            notice.ok
              ? "border-mint bg-surface-2 text-ink"
              : "border-danger bg-surface-2 text-ink"
          }`}
        >
          {notice.text}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || over}
        className="min-h-12 w-full rounded-xl bg-accent px-4 py-2 text-base font-medium text-accent-ink hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-60"
      >
        {pending ? "처리 중..." : `${TABS.find((t) => t.type === tab)?.label} 기록`}
      </button>
    </form>
  );
}
