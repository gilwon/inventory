"use client";
// Lucian UX/UI Prompt #030 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#030
// 기간 선택 달력. 접힌 요약 버튼을 눌러 펼치고, 고른 기간을 GET 폼의 숨은 from·to 입력으로 보낸다.

import { useEffect, useId, useRef, useState } from "react";
import {
  WEEKDAYS,
  addDays,
  monthCells,
  parseKey,
  shiftMonth,
  summarize,
  todayKey,
  weekdayOf,
} from "@/lib/date-range";
import "./date-range.css";

type Month = { y: number; m: number };
// 달을 넘기는 동안만 이전 달을 함께 그린다(방향 dir 은 1 또는 -1).
type Anim = { prev: Month; dir: number };

const monthLabel = (c: Month) => `${c.y}년 ${c.m + 1}월`;
const dayLabel = (k: string) => {
  const p = parseKey(k);
  return p ? `${p.y}년 ${p.m + 1}월 ${p.d}일 (${WEEKDAYS[weekdayOf(k)]})` : k;
};

export function DateRange({ from: initFrom, to: initTo }: { from: string; to: string }) {
  const uid = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const wantFocus = useRef(false);
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(initFrom);
  const [to, setTo] = useState(initTo);
  const [hover, setHover] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [today, setToday] = useState("");
  const [cur, setCur] = useState<Month | null>(() => {
    const p = parseKey(initFrom);
    return p ? { y: p.y, m: p.m } : null;
  });
  const [anim, setAnim] = useState<Anim | null>(null);

  // 달 넘김 애니메이션이 끝나면 이전 달을 치운다.
  useEffect(() => {
    if (!anim) return;
    const t = setTimeout(() => setAnim(null), 460);
    return () => clearTimeout(t);
  }, [anim]);

  // 방향키로 옮긴 날짜에 포커스를 준다(달이 바뀐 뒤 그려진 버튼 포함).
  useEffect(() => {
    if (!wantFocus.current || !focusKey) return;
    wantFocus.current = false;
    viewRef.current?.querySelector<HTMLButtonElement>(`.u030-grid:not(.out) [data-k="${focusKey}"]`)?.focus();
  }, [focusKey, cur]);

  function changeMonth(next: Month, dir: number) {
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setAnim(cur && dir && !rm ? { prev: cur, dir } : null);
    setCur(next);
  }

  function toggle() {
    if (!open) {
      const t = todayKey();
      setToday(t);
      setCur((c) => c ?? { y: Number(t.slice(0, 4)), m: Number(t.slice(5, 7)) - 1 });
    }
    setOpen(!open);
  }

  function pick(k: string) {
    if (!from || to) {
      // 새로 시작한다(하루짜리 기간에서 같은 날을 다시 누르면 시작일만 남는다)
      setFrom(k);
      setTo("");
    } else if (k === from) {
      setTo(k); // 시작일을 한 번 더 누르면 하루짜리 기간
    } else {
      setTo(k > from ? k : from);
      setFrom(k > from ? from : k);
    }
    setHover(null);
    setFocusKey(k);
  }

  function clear() {
    if (!from && !to) return;
    setFrom("");
    setTo("");
    setHover(null);
  }

  function onKey(e: React.KeyboardEvent<HTMLDivElement>) {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>(".u030-d");
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!b || !step || !b.dataset.k || !cur) return;
    e.preventDefault();
    const nk = addDays(b.dataset.k, step);
    const p = parseKey(nk);
    if (!p) return;
    wantFocus.current = true;
    setFocusKey(nk);
    if (from && !to) setHover(nk);
    if (p.y !== cur.y || p.m !== cur.m) changeMonth({ y: p.y, m: p.m }, nk > b.dataset.k ? 1 : -1);
  }

  // 칸 하나의 범위 표시. 끝날짜가 없으면 커서가 가리키는 날짜까지 띠를 미리 보인다.
  let lo = from;
  let hi: string | null = to || (from && hover ? hover : null);
  if (lo && hi && hi < lo) [lo, hi] = [hi, lo];

  function grid(c: Month, leaving: boolean) {
    const cells = monthCells(c.y, c.m);
    const tab =
      focusKey && cells.includes(focusKey)
        ? focusKey
        : from && cells.includes(from)
          ? from
          : cells.find(Boolean);
    return (
      <div
        key={`${c.y}-${c.m}`}
        className={`u030-grid${leaving ? " out" : anim ? " in" : ""}`}
        style={anim ? ({ "--d": anim.dir } as React.CSSProperties) : undefined}
        role="grid"
        aria-hidden={leaving || undefined}
      >
        {cells.map((k, i) => {
          if (!k) return <div key={i} className="u030-cell" role="gridcell" />;
          const cls =
            "u030-cell" +
            (k === (hi === null ? from : lo) ? " s" : "") +
            (hi !== null && k === hi ? " e" : "") +
            (hi !== null && k >= lo && k <= hi ? " in" : "");
          return (
            <div key={i} className={cls} role="gridcell" aria-selected={k === from || k === to}>
              <button
                type="button"
                className={`u030-d${k === today ? " today" : ""}`}
                data-k={k}
                tabIndex={!leaving && k === tab ? 0 : -1}
                aria-label={dayLabel(k)}
              >
                {Number(k.slice(8))}
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  const empty = !from && !to;

  return (
    <div
      className="ux u030-wrap"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.preventDefault();
          setOpen(false);
          toggleRef.current?.focus();
        }
      }}
    >
      <span id={`${uid}-lbl`} className="u030-lbl">기간</span>
      <button
        ref={toggleRef}
        id={`${uid}-btn`}
        type="button"
        className="u030-toggle"
        aria-expanded={open}
        aria-controls={`${uid}-panel`}
        aria-labelledby={`${uid}-lbl ${uid}-btn`}
        onClick={toggle}
      >
        <span>{empty ? "기간 선택 (전체)" : summarize(from, to)}</span>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 6l4.5 4.5L12.5 6" /></svg>
      </button>
      {from && <input type="hidden" name="from" value={from} />}
      {to && <input type="hidden" name="to" value={to} />}

      {open && cur && (
        <div id={`${uid}-panel`} className="ux u030">
          <div className="u030-pills">
            <div className={`u030-pill${!from || to ? " on" : ""}`}>
              <small>시작일</small>
              <b className={from ? "" : "ph"}>{from || "날짜 선택"}</b>
            </div>
            <div className={`u030-pill${from && !to ? " on" : ""}`}>
              <small>종료일</small>
              <b className={to ? "" : "ph"}>{to || "날짜 선택"}</b>
            </div>
          </div>
          <div className="u030-top">
            <div className="u030-m" aria-live="polite">
              {anim && (
                <span key={`o-${monthLabel(anim.prev)}`} className="out" style={{ "--d": anim.dir } as React.CSSProperties}>
                  {monthLabel(anim.prev)}
                </span>
              )}
              <span
                key={monthLabel(cur)}
                className={anim ? "in" : undefined}
                style={anim ? ({ "--d": anim.dir } as React.CSSProperties) : undefined}
              >
                {monthLabel(cur)}
              </span>
            </div>
            <div className="u030-nav">
              <button type="button" aria-label="이전 달" onClick={() => changeMonth(shiftMonth(cur.y, cur.m, -1), -1)}>
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3.5L5.5 8l4.5 4.5" /></svg>
              </button>
              <button type="button" aria-label="다음 달" onClick={() => changeMonth(shiftMonth(cur.y, cur.m, 1), 1)}>
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5L10.5 8 6 12.5" /></svg>
              </button>
            </div>
          </div>
          <div className="u030-wk" aria-hidden="true">
            {WEEKDAYS.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          <div
            ref={viewRef}
            className="u030-view"
            onClick={(e) => {
              const k = (e.target as HTMLElement).closest<HTMLButtonElement>(".u030-d")?.dataset.k;
              if (k) pick(k);
            }}
            onPointerOver={(e) => {
              const k = (e.target as HTMLElement).closest<HTMLButtonElement>(".u030-d")?.dataset.k;
              if (k && from && !to) setHover(k);
            }}
            onPointerLeave={() => hover !== null && setHover(null)}
            onKeyDown={onKey}
          >
            {anim && grid(anim.prev, true)}
            {grid(cur, false)}
          </div>
          <div className="u030-foot">
            <span className="u030-sum" aria-live="polite">
              {empty ? "시작일을 골라 주세요" : summarize(from, to)}
            </span>
            <button type="button" className="u030-clear" aria-disabled={empty} onClick={clear}>
              기간 지우기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
