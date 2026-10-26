"use client";
// Lucian UX/UI Prompt #032 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#032
// 끌어다 놓는 업로드. 파일 1개를 끌어다 놓거나 눌러서 고르고, 선택된 파일의 실제 단계(선택됨·진행 중·완료·실패)를 보인다.

import { useRef, useState } from "react";
import "./file-drop.css";

export type FileDropStatus = "idle" | "selected" | "working" | "done" | "error";

const DEFAULT_TEXT: Record<FileDropStatus, string> = {
  idle: "",
  selected: "선택됨",
  working: "처리하는 중",
  done: "완료",
  error: "실패",
};

// 확장자 배지 색(원본 값). xlsx 는 원본에 없어 같은 초록을 쓴다.
const TYPE: Record<string, string> = {
  xlsx: "#22A06B",
  png: "#3D8BFF",
  jpg: "#22A06B",
  jpeg: "#22A06B",
};

function size(b: number) {
  return b > 1048576
    ? (b / 1048576).toFixed(1) + " MB"
    : Math.max(1, Math.round(b / 1024)) + " KB";
}

type Props = {
  id: string;
  accept?: string;
  disabled?: boolean;
  // 영역 안 문구. label 뒤에 강조색으로 action 이 이어진다.
  label: string;
  action: string;
  hint?: string;
  // 호출부가 들고 있는 현재 선택 파일(없으면 영역만 보인다)
  file: File | null;
  status: FileDropStatus;
  // 상태 줄 문구. 없으면 기본 문구를 쓴다.
  statusText?: string;
  // 파일을 고르면 File, 제거하면 null. 형식·크기 검사는 호출부가 한다.
  onFile: (file: File | null) => void;
};

export function FileDrop({
  id,
  accept,
  disabled = false,
  label,
  action,
  hint,
  file,
  status,
  statusText,
  onFile,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
  const [over, setOver] = useState(false);
  const [extra, setExtra] = useState(false);

  // 여러 개가 와도 첫 번째만 쓰고 안내한다.
  function take(list: FileList | null) {
    const first = list?.[0];
    setExtra((list?.length ?? 0) > 1);
    if (first) onFile(first);
  }

  function remove() {
    setExtra(false);
    onFile(null);
  }

  const ext = file ? (file.name.split(".").pop() ?? "").toLowerCase() : "";

  return (
    <div
      className={`ux u032${over ? " is-over" : ""}${disabled ? " is-off" : ""}`}
      onDragEnter={(e) => {
        e.preventDefault();
        if (disabled) return;
        depth.current++;
        setOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = disabled ? "none" : "copy";
      }}
      onDragLeave={() => {
        if (--depth.current <= 0) {
          depth.current = 0;
          setOver(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        depth.current = 0;
        setOver(false);
        if (!disabled) take(e.dataTransfer.files);
      }}
    >
      {/* 실제 파일 입력은 숨기지 않고 시각적으로만 가린다. 포커스·Enter·Space 는 브라우저 기본 동작이다. */}
      <input
        ref={inputRef}
        id={id}
        className="u032-file"
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(e) => {
          take(e.target.files);
          // 같은 파일을 다시 골라도 change 가 오도록 비운다(선택 파일은 호출부가 들고 있다).
          e.target.value = "";
        }}
      />
      <label htmlFor={id} className="u032-zone">
        <svg className="u032-dash" aria-hidden="true">
          <rect width="100%" height="100%" rx="25" />
        </svg>
        <span className="u032-orb" aria-hidden="true">
          <svg viewBox="0 0 28 28">
            <path d="M8.5 20.5H7a5 5 0 0 1-.6-10 7 7 0 0 1 13.4-1.6A5.5 5.5 0 0 1 21 20.5h-1.5M14 13v10M10.5 16.5L14 13l3.5 3.5" />
          </svg>
        </span>
        <b>
          {label} <em>{action}</em>
        </b>
        {hint && <small>{hint}</small>}
      </label>
      <div role="status">
        {extra && (
          <p className="u032-note">
            파일은 1개만 쓸 수 있어 첫 번째 파일만 선택했습니다.
          </p>
        )}
      </div>
      <div className="u032-list" aria-live="polite">
        {file && status !== "idle" && (
          <div
            className={`u032-row${status === "done" ? " done" : ""}${status === "error" ? " fail" : ""}`}
          >
            <span
              className="u032-ic"
              style={{ "--c": TYPE[ext] ?? "#8E8A97" } as React.CSSProperties}
              aria-hidden="true"
            >
              {ext.slice(0, 3).toUpperCase() || "FILE"}
            </span>
            <span className="u032-meta">
              <b>{file.name}</b>
              <small>
                {size(file.size)} · {statusText ?? DEFAULT_TEXT[status]}
              </small>
              {status === "error" && (
                // 같은 파일로 재시도하지 않고 새 파일 선택으로 유도한다.
                <button
                  className="u032-retry"
                  type="button"
                  disabled={disabled}
                  onClick={() => inputRef.current?.click()}
                >
                  다른 파일 고르기
                </button>
              )}
            </span>
            {status === "working" && (
              <span className="u032-st">
                <span className="u032-spin" aria-hidden="true" />
              </span>
            )}
            {status === "done" && (
              <span className="u032-st">
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M3.5 8.4l3 3 6-6.4" />
                </svg>
              </span>
            )}
            <button
              className="u032-rm"
              type="button"
              disabled={disabled}
              aria-label={`${file.name} 제거`}
              onClick={remove}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
