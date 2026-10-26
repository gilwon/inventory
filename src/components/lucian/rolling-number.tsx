"use client";
// Lucian UX/UI Prompt #098 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#098
// 자리마다 따로 굴러가는 숫자. 직전에 본 값과 같으면 움직이지 않고, 다르면 달라진 자리만 굴러간다.

import { useLayoutEffect, useRef } from "react";
import "./rolling-number.css";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
// 구조(자릿수, 쉼표 위치)가 같은지 비교할 때 숫자를 모두 0으로 본다.
const shape = (s: string) => s.replace(/\d/g, "0");

export function RollingNumber({
  value,
  label,
  rowHeight = 40,
  fontSize = 32,
}: {
  // 이미 서식을 입힌 문자열. 예: "1,234"
  value: string;
  label: string;
  rowHeight?: number;
  fontSize?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const key = `rolling-number:${label}`;

  // 화면에 그려지기 전에 시작 자리를 직전 값(없으면 0)으로 되돌렸다가, 다음 프레임에 현재 값으로 굴린다.
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const cols = Array.from(root.querySelectorAll<HTMLElement>(".u098-col"));
    const finalDigits = cols.map((c) => c.style.getPropertyValue("--d"));
    let prev: string | null = null;
    try {
      prev = sessionStorage.getItem(key);
    } catch {
      prev = null;
    }
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const save = () => {
      try {
        sessionStorage.setItem(key, value);
      } catch {
        // 저장소를 못 써도 숫자 표시는 그대로 동작한다.
      }
    };
    if (prev === value || reduced) {
      save();
      return;
    }
    const from =
      prev !== null && shape(prev) === shape(value) ? prev : shape(value);
    const fromDigits = from.replace(/\D/g, "").split("");
    cols.forEach((c, i) => {
      c.style.transition = "none";
      c.style.setProperty("--d", fromDigits[i] ?? "0");
    });
    void root.offsetWidth;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        cols.forEach((c, i) => {
          c.style.transition = "";
          c.style.setProperty("--d", finalDigits[i]);
        });
        save();
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      // 중간에 정리되면(StrictMode 재마운트 등) 최종 값으로 바로 돌려 둔다.
      cols.forEach((c, i) => {
        c.style.transition = "";
        c.style.setProperty("--d", finalDigits[i]);
      });
    };
  }, [value, key]);

  let di = -1;
  return (
    <div
      ref={ref}
      className="ux u098-num"
      role="img"
      aria-label={`${label} ${value}`}
      style={
        {
          "--rh": `${rowHeight}px`,
          "--rf": `${fontSize}px`,
        } as React.CSSProperties
      }
    >
      {value.split("").map((ch, i) =>
        /\d/.test(ch) ? (
          <span
            key={i}
            className="u098-col"
            style={{ "--d": Number(ch), "--i": ++di } as React.CSSProperties}
          >
            {DIGITS.map((n) => (
              <span key={n}>{n}</span>
            ))}
          </span>
        ) : (
          <span key={i} className="u098-sym">
            {ch}
          </span>
        ),
      )}
    </div>
  );
}
