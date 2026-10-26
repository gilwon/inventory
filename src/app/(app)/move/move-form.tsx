"use client";
// 입고·출고·이동·조정 탭 입력 폼 (품목 검색, 위치 선택, 현재 수량 안내)

import { useEffect, useRef, useState, useTransition } from "react";
import { Segmented } from "@/components/lucian/segmented";
import { ToastHost, useToast } from "@/components/lucian/toast";
import { formatQty } from "@/lib/format";
import {
  MOVE_FIELD_ORDER,
  isOverStock,
  moveButtonLabel,
  moveSummary,
  qtyOverMessage,
  validateMove,
  type MoveErrors,
  type MoveField,
} from "@/lib/move-summary";
import { resolveScan } from "../scan/actions";
import { Scanner } from "../scan/scanner";
import { btnSecondary, errCls } from "../items/common";
import {
  getStockAction,
  searchItemsAction,
  submitMovement,
  type ItemHit,
  type MoveInput,
} from "./actions";

type Loc = { id: string; path: string };
type Tab = MoveInput["type"];

// done 은 기록 성공 토스트 제목이다.
const TABS: { type: Tab; label: string; done: string }[] = [
  { type: "receive", label: "입고", done: "입고를 기록했습니다" },
  { type: "issue", label: "출고", done: "출고를 기록했습니다" },
  { type: "transfer", label: "이동", done: "이동을 기록했습니다" },
  { type: "adjust", label: "조정", done: "조정을 기록했습니다" },
];

const MAX_QTY = 2147483647;
// 서버 검색 상한(actions.ts 의 lim). "use server" 파일은 상수를 내보낼 수 없어 값을 맞춰 둔다.
const SEARCH_LIMIT = 8;
// 오류 칸 → 포커스할 입력 id
const FIELD_ID: Record<MoveField, string> = {
  item: "item-q",
  loc: "loc",
  toLoc: "to-loc",
  qty: "qty",
  reason: "reason",
};

const focus =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";
// 모바일에서 입력 확대를 막으려고 글자 크기를 16px(text-base)로 둔다.
// scroll-mb 는 포커스 이동 때 모바일 하단 탭 바 뒤로 숨지 않게 하는 여백이다.
const field = `block scroll-mb-40 scroll-mt-4 min-h-12 w-full min-w-0 rounded-xl border border-ink-3 bg-surface px-3 py-2 text-base text-ink ${focus}`;
const label = "block text-sm font-medium";

export function MoveForm({ locations }: { locations: Loc[] }) {
  const [tab, setTab] = useState<Tab>("receive");
  const [item, setItem] = useState<ItemHit | null>(null);
  const [query, setQuery] = useState("");
  // 스캐너를 연 칸. 한 번에 하나만 연다.
  const [scanFor, setScanFor] = useState<"item" | "loc" | "to-loc" | null>(null);
  const [hits, setHits] = useState<{ q: string; items: ItemHit[] } | null>(null);
  const [locId, setLocId] = useState("");
  const [toLocId, setToLocId] = useState("");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [stock, setStock] = useState<{ key: string; qty: number | null } | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [errors, setErrors] = useState<MoveErrors>({});
  // 제출 검증이 실패했을 때 렌더 뒤에 포커스를 옮길 칸
  const pendingFocus = useRef<string | null>(null);
  const toast = useToast();
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
  const over = isOverStock(tab, qtyNum, current);
  const unit = item?.unit ?? "";
  const pathOf = (id: string) => locations.find((l) => l.id === id)?.path ?? "";

  // 값을 고친 칸의 오류만 지운다.
  function clearErr(...keys: MoveField[]) {
    setErrors((e) => (keys.some((k) => e[k]) ? { ...e, ...Object.fromEntries(keys.map((k) => [k, undefined])) } : e));
  }

  // 검증 실패 뒤 오류 문구가 그려진 다음 첫 오류 칸으로 포커스를 옮긴다.
  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    pendingFocus.current = null;
    document.getElementById(id)?.focus();
  }, [errors]);

  function changeTab(next: Tab) {
    setTab(next);
    setQty("");
    setReason("");
    setErrors({});
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateMove({
      tab,
      hasItem: !!item,
      locId,
      toLocId,
      qtyNum,
      current,
      unit,
      reason,
    });
    const first = MOVE_FIELD_ORDER.find((k) => errs[k]);
    if (first || !item) {
      setErrors(errs);
      if (first) pendingFocus.current = FIELD_ID[first];
      return;
    }
    setErrors({});
    // validateMove 가 통과했으면 qtyNum 은 null 이 아니다.
    if (qtyNum === null) return;

    const input: MoveInput = {
      type: tab,
      itemId: item.id,
      locationId: locId,
      toLocationId: tab === "transfer" ? toLocId : undefined,
      qty,
      reason,
    };
    const done = TABS.find((t) => t.type === tab)?.done ?? "";
    const target = `${item.sku} ${item.name}, ${pathOf(locId)}${
      tab === "transfer" ? " > " + pathOf(toLocId) : ""
    }, ${formatQty(qtyNum, unit)}`;

    startTransition(async () => {
      const res = await submitMovement(input);
      if (!res.ok) return toast.show("err", res.error);
      if (res.unchanged) toast.show("info", "현재 수량과 같아 기록하지 않았습니다.");
      else toast.show("ok", done, target);
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
    err?: string,
  ) {
    return (
      <div className="space-y-1">
        <label htmlFor={id} className={label}>
          {text} (필수)
        </label>
        <div className="flex gap-2">
          <select
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-required="true"
            aria-invalid={err ? true : undefined}
            aria-describedby={err ? `err-${id}` : undefined}
            className={field}
          >
            <option value="">위치 선택</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.path}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setScanFor((v) => (v === id ? null : (id as "loc" | "to-loc")))}
            aria-expanded={scanFor === id}
            aria-label={`${text} 스캔`}
            className={btnSecondary}
          >
            스캔
          </button>
        </div>
        {scanFor === id && (
          <Scanner onResult={(code) => onScanned(id as "loc" | "to-loc", code)} onClose={() => setScanFor(null)} />
        )}
        {err && (
          <p id={`err-${id}`} className={errCls}>
            {err}
          </p>
        )}
      </div>
    );
  }

  // 읽은 코드를 해석해 해당 칸만 채운다. 해석되지 않으면 칸은 그대로 두고 안내한다.
  async function onScanned(field: "item" | "loc" | "to-loc", code: string) {
    setScanFor(null);
    const r = await resolveScan(code);
    if (r.kind === "error") return toast.show("err", r.message);
    if (r.kind === "none") return toast.show("err", "등록되지 않은 코드입니다.");
    if (field === "item") {
      if (r.kind !== "item") return toast.show("err", "품목 코드가 아닙니다.");
      setQuery(code);
      clearErr("item");
      return;
    }
    if (r.kind !== "location") return toast.show("err", "위치 코드가 아닙니다.");
    if (!locations.some((l) => l.id === r.id))
      return toast.show("err", "선택할 수 없는 위치입니다.");
    if (field === "loc") {
      setLocId(r.id);
      clearErr("loc", "toLoc");
    } else {
      setToLocId(r.id);
      clearErr("toLoc");
    }
  }

  const shown = hits && hits.q === term ? hits.items : null;
  const itemLabel = item ? `${item.sku} ${item.name}` : null;
  const summary = moveSummary({
    tab,
    itemLabel,
    locPath: pathOf(locId),
    toPath: pathOf(toLocId),
    qtyNum,
    current,
    unit,
  });
  const qtyErr = over ? undefined : errors.qty;
  const qtyDesc = qtyErr ? "qty-hint err-qty" : "qty-hint";

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <Segmented
        ariaLabel="작업 유형"
        options={TABS.map((t) => ({ value: t.type, label: t.label }))}
        value={tab}
        onChange={changeTab}
      />

      {/* 대상 묶음. 품목과 위치 */}
      <div className="space-y-4">
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
            <div className="flex gap-2">
              <input
                id="item-q"
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  clearErr("item");
                }}
                autoComplete="off"
                aria-invalid={errors.item ? true : undefined}
                aria-describedby={errors.item ? "err-item" : undefined}
                className={field}
              />
              <button
                type="button"
                onClick={() => setScanFor((v) => (v === "item" ? null : "item"))}
                aria-expanded={scanFor === "item"}
                aria-label="품목 스캔"
                className={btnSecondary}
              >
                스캔
              </button>
            </div>
            {errors.item && (
              <p id="err-item" className={errCls}>
                {errors.item}
              </p>
            )}
            {scanFor === "item" && (
              <Scanner onResult={(code) => onScanned("item", code)} onClose={() => setScanFor(null)} />
            )}
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
                        clearErr("item");
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
            {term && shown && shown.length >= SEARCH_LIMIT && (
              <p className="text-sm text-ink-2">
                검색 결과는 {SEARCH_LIMIT}건까지만 보입니다. 더 좁혀서 검색해 주세요.
              </p>
            )}
          </div>
        )}

        {locationSelect(
          "loc",
          tab === "transfer" ? "출발 위치" : "위치",
          locId,
          (v) => {
            setLocId(v);
            clearErr("loc", "toLoc");
          },
          errors.loc,
        )}

        {tab === "transfer" &&
          locationSelect(
            "to-loc",
            "도착 위치",
            toLocId,
            (v) => {
              setToLocId(v);
              clearErr("toLoc");
            },
            errors.toLoc,
          )}
      </div>

      {/* 수량 묶음. 현재 수량, 수량, 사유 */}
      <div className="space-y-4 border-t border-line pt-6">
        {tab !== "receive" && item && locId && (
          <div aria-live="polite" className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-base font-semibold text-ink">
              현재 수량{" "}
              {current === undefined
                ? "확인 중..."
                : current === null
                  ? "조회 실패"
                  : formatQty(current, unit)}
            </p>
            {current === null && (
              <button
                type="button"
                onClick={() => setRefresh((n) => n + 1)}
                className={btnSecondary}
              >
                다시 조회
              </button>
            )}
          </div>
        )}

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
            onChange={(e) => {
              setQty(e.target.value.replace(/\D/g, ""));
              clearErr("qty");
            }}
            aria-invalid={over || qtyErr ? true : undefined}
            aria-describedby={qtyDesc}
            className={field}
          />
          <div id="qty-hint" aria-live="polite" className="text-sm">
            {over && (
              <p className="font-medium text-danger">
                {qtyOverMessage(current as number, unit)}
              </p>
            )}
            {tab === "adjust" && qtyNum !== null && typeof current === "number" && (
              <p className="text-ink-2">
                차이 {qtyNum - current > 0 ? "+" : ""}
                {formatQty(qtyNum - current)}
              </p>
            )}
          </div>
          {qtyErr && (
            <p id="err-qty" className={errCls}>
              {qtyErr}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="reason" className={label}>
            {tab === "adjust" ? "사유 (필수)" : "사유 (선택)"}
          </label>
          <input
            id="reason"
            type="text"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              clearErr("reason");
            }}
            autoComplete="off"
            aria-invalid={errors.reason ? true : undefined}
            aria-describedby={errors.reason ? "err-reason" : undefined}
            className={field}
          />
          {errors.reason && (
            <p id="err-reason" className={errCls}>
              {errors.reason}
            </p>
          )}
        </div>
      </div>

      {/* 제출 묶음. 요약은 시각 표시만 하고(live 영역 아님) 버튼 설명으로 연결한다. */}
      <div className="space-y-2">
        <p id="move-summary" className="break-words text-sm text-ink">
          {summary}
        </p>
        <button
          type="submit"
          disabled={pending || over}
          aria-describedby="move-summary"
          className="min-h-12 w-full rounded-xl bg-accent px-4 py-2 text-base font-medium text-accent-ink hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-60"
        >
          {pending ? "처리 중..." : moveButtonLabel(tab, qtyNum, unit)}
        </button>
      </div>

      <ToastHost toast={toast} />
    </form>
  );
}
