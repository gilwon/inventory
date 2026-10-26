"use client";
// Lucian UX/UI Prompt #047 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#047
// 세그먼트 컨트롤. 선택 손잡이가 늘어나며 옮겨 가고, 좌우 방향키로 선택을 옮긴다.

import { useRef, useState } from "react";
import "./segmented.css";

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  const n = options.length;
  const idx = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const btns = useRef<(HTMLButtonElement | null)[]>([]);

  // 이동 방향을 렌더 중에 계산한다(처음에는 0이라 움직이지 않는다).
  const [prevIdx, setPrevIdx] = useState(idx);
  const [dir, setDir] = useState(0);
  if (idx !== prevIdx) {
    setPrevIdx(idx);
    setDir(idx > prevIdx ? 1 : -1);
  }

  function move(i: number) {
    onChange(options[i].value);
    btns.current[i]?.focus();
  }

  return (
    <div
      className={`ux u047-seg${dir > 0 ? " go-r" : dir < 0 ? " go-l" : ""}`}
      role="radiogroup"
      aria-label={ariaLabel}
      style={{ "--n": n } as React.CSSProperties}
    >
      <span
        className="u047-knob"
        aria-hidden="true"
        style={
          {
            "--l": `calc(4px + ${idx} * (100% - 8px) / ${n})`,
            "--r": `calc(4px + ${n - 1 - idx} * (100% - 8px) / ${n})`,
          } as React.CSSProperties
        }
      />
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            btns.current[i] = el;
          }}
          className="u047-opt"
          type="button"
          role="radio"
          aria-checked={i === idx}
          tabIndex={i === idx ? 0 : -1}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => {
            const d =
              e.key === "ArrowRight" || e.key === "ArrowDown"
                ? 1
                : e.key === "ArrowLeft" || e.key === "ArrowUp"
                  ? -1
                  : 0;
            if (d) {
              e.preventDefault();
              move((i + d + n) % n);
            }
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
