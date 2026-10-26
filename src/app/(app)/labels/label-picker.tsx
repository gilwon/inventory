"use client";
// 라벨로 만들 품목·위치를 검색해 고르고 라벨 격자를 만드는 화면
import { useState } from "react";
import { Segmented } from "@/components/lucian/segmented";
import type { LabelFormat } from "@/lib/label-format";
import { btnPrimary, btnSecondary, cardCls, errCls, inputCls } from "../items/common";
import { buildLabels, type Label } from "./actions";
import { LabelSheet } from "./label-sheet";

type Entry = { id: string; title: string; code: string };

function Group({
  title,
  list,
  picked,
  onToggle,
  onAll,
}: {
  title: string;
  list: Entry[];
  picked: Set<string>;
  onToggle: (id: string) => void;
  onAll: (ids: string[], on: boolean) => void;
}) {
  const allOn = list.length > 0 && list.every((e) => picked.has(e.id));
  return (
    <fieldset className={`${cardCls} space-y-1`}>
      <legend className="px-1 text-sm font-bold text-ink">
        {title} ({list.length})
      </legend>
      {list.length > 0 && (
        <button
          type="button"
          className={btnSecondary}
          onClick={() => onAll(list.map((e) => e.id), !allOn)}
        >
          {allOn ? "검색 결과 선택 해제" : "검색 결과 모두 선택"}
        </button>
      )}
      {list.length === 0 && <p className="text-sm text-ink-2">검색 결과가 없습니다.</p>}
      <ul className="max-h-72 overflow-y-auto">
        {list.map((e) => (
          <li key={e.id}>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 py-1">
              <input
                type="checkbox"
                className="h-5 w-5 shrink-0 accent-accent"
                checked={picked.has(e.id)}
                onChange={() => onToggle(e.id)}
              />
              <span className="min-w-0 break-words text-sm text-ink">
                {e.title}
                <span className="block text-xs text-ink-2">{e.code}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

export function LabelPicker({ items, locations }: { items: Entry[]; locations: Entry[] }) {
  const [q, setQ] = useState("");
  const [pickedItems, setPickedItems] = useState<Set<string>>(new Set());
  const [pickedLocs, setPickedLocs] = useState<Set<string>>(new Set());
  const [labels, setLabels] = useState<Label[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [format, setFormat] = useState<LabelFormat>("qr");

  const term = q.trim().toLowerCase();
  const match = (e: Entry) =>
    !term || e.title.toLowerCase().includes(term) || e.code.toLowerCase().includes(term);
  const shownItems = items.filter(match);
  const shownLocs = locations.filter(match);

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void) => (id: string) => {
    const next = new Set(set);
    if (!next.delete(id)) next.add(id);
    setter(next);
  };
  const toggleAll = (set: Set<string>, setter: (s: Set<string>) => void) => (ids: string[], on: boolean) => {
    const next = new Set(set);
    ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
    setter(next);
  };

  // 형식이 바뀌면 이전 형식의 미리보기와 오류를 지워 형식이 섞이지 않게 한다.
  function changeFormat(f: LabelFormat) {
    if (f === format) return;
    setFormat(f);
    setLabels(null);
    setError(null);
  }

  const count = pickedItems.size + pickedLocs.size;

  async function make() {
    setBusy(true);
    setError(null);
    try {
      const r = await buildLabels([...pickedItems], [...pickedLocs], format);
      if (r.ok) setLabels(r.labels);
      else setError(r.error);
    } catch {
      setError("라벨을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="label-noprint space-y-4">
        <div className="space-y-1">
          <label htmlFor="label-q" className="block text-sm font-medium text-ink">
            품목·위치 검색
          </label>
          <input
            id="label-q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={inputCls}
            placeholder="이름, SKU, 위치 코드"
            autoComplete="off"
          />
        </div>
        <Group title="품목" list={shownItems} picked={pickedItems}
          onToggle={toggle(pickedItems, setPickedItems)} onAll={toggleAll(pickedItems, setPickedItems)} />
        <Group title="위치" list={shownLocs} picked={pickedLocs}
          onToggle={toggle(pickedLocs, setPickedLocs)} onAll={toggleAll(pickedLocs, setPickedLocs)} />
        <div className="space-y-1">
          <p className="text-sm font-medium text-ink">출력 형식</p>
          <Segmented
            ariaLabel="출력 형식"
            options={[
              { value: "qr", label: "QR" },
              { value: "barcode", label: "바코드" },
            ]}
            value={format}
            onChange={changeFormat}
          />
        </div>
        {error && <p role="alert" className={errCls}>{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnPrimary} disabled={busy || count === 0} onClick={make}>
            {busy ? "만드는 중..." : `라벨 만들기 (${count})`}
          </button>
          {labels && labels.length > 0 && (
            <button type="button" className={btnSecondary} onClick={() => window.print()}>
              인쇄
            </button>
          )}
        </div>
      </div>
      {labels && (
        <p className="label-noprint text-sm text-ink-2">
          {labels[0]?.format === "barcode" ? "바코드" : "QR"} 라벨 {labels.length}개
        </p>
      )}
      {labels && <LabelSheet labels={labels} />}
    </div>
  );
}
