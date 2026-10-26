"use client";
// Lucian UX/UI Prompt #062 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#062
// 로그인 카드. 서버 액션 결과를 받아 실패 시 카드가 흔들리고 오류 문구를 보이며, 비밀번호 보기 버튼을 둔다.

import { useEffect, useId, useRef, useState } from "react";
import "./login-card.css";

type Props = {
  // useActionState 가 돌려주는 액션 함수와 결과(제출마다 새 객체)
  formAction: (formData: FormData) => void;
  state: { error: string | null };
  pending: boolean;
};

export function LoginCard({ formAction, state, pending }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);
  const uid = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  // 비밀번호를 고치기 시작하면 오류 표시를 거둔다(어느 결과에 대해 거뒀는지 기억).
  const [clearedFor, setClearedFor] = useState<object | null>(null);

  const bad = Boolean(state.error) && clearedFor !== state;

  // 실패 결과가 올 때마다 카드를 흔들고 비밀번호를 선택한다. 결과 객체는 제출마다 새로 만들어진다.
  useEffect(() => {
    if (!state.error) return;
    const root = rootRef.current;
    if (root) {
      root.classList.remove("shake");
      void root.offsetWidth;
      root.classList.add("shake");
    }
    pwRef.current?.select();
  }, [state]);

  return (
    <div
      ref={rootRef}
      className="ux u062"
      onAnimationEnd={(e) => {
        if (e.target === rootRef.current)
          rootRef.current.classList.remove("shake");
      }}
    >
      <form action={formAction} className="u062-pane" noValidate>
        <span className="u062-logo" aria-hidden="true" />
        <h1 className="u062-title">재고 관리 로그인</h1>
        <p className="u062-sub">이메일과 비밀번호로 로그인하세요</p>

        <div className="u062-f">
          <label htmlFor={`${uid}-email`}>이메일</label>
          <div className="u062-box">
            <input
              id={`${uid}-email`}
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className={`u062-f${bad ? " bad" : ""}`}>
          <label htmlFor={`${uid}-pw`}>비밀번호</label>
          <span className={`u062-caps${caps ? " on" : ""}`} aria-live="polite">
            Caps Lock 켜짐
          </span>
          <div className="u062-box">
            <input
              ref={pwRef}
              id={`${uid}-pw`}
              name="password"
              type={show ? "text" : "password"}
              placeholder="비밀번호 입력"
              autoComplete="current-password"
              required
              value={password}
              aria-describedby={`${uid}-err`}
              aria-invalid={bad ? true : undefined}
              onChange={(e) => {
                setPassword(e.target.value);
                setClearedFor(state);
              }}
              onKeyUp={(e) => setCaps(e.getModifierState("CapsLock"))}
            />
            <button
              className="u062-eye"
              type="button"
              aria-pressed={show}
              aria-label={show ? "비밀번호 숨기기" : "비밀번호 보기"}
              onClick={() => setShow((v) => !v)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <g className="u062-lid">
                  <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
                  <circle cx="12" cy="12" r="3" />
                </g>
                <path className="u062-slash" d="M4 4l16 16" />
              </svg>
            </button>
          </div>
          <div className="u062-err">
            <span id={`${uid}-err`} role="alert">
              {bad ? state.error : ""}
            </span>
          </div>
        </div>

        <button
          className={`u062-go${pending ? " busy" : ""}`}
          type="submit"
          disabled={pending}
          aria-label={pending ? "확인하는 중" : undefined}
        >
          <span>로그인</span>
          <i aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
