"use client";
// 카메라로 QR·바코드를 읽는 공용 스캔 컴포넌트 (카메라를 못 쓰면 직접 입력으로 대체)

import { useEffect, useRef, useState } from "react";
import {
  btnPrimary,
  btnSecondary,
  errCls,
  inputCls,
} from "../items/common";

type Props = {
  onResult: (code: string) => void;
  onClose: () => void;
};

// 카메라 오류를 한국어 안내로 바꾼다.
function cameraError(e: unknown): string {
  const name = e instanceof DOMException ? e.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "카메라 권한이 거절되었습니다. 브라우저 설정에서 카메라를 허용하거나 아래에 직접 입력해 주세요.";
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return "사용할 수 있는 카메라가 없습니다. 아래에 직접 입력해 주세요.";
  if (name === "NotSupportedError")
    return "이 브라우저나 연결에서는 카메라를 쓸 수 없습니다. HTTPS 주소로 접속했는지 확인하거나 아래에 직접 입력해 주세요.";
  return "카메라를 시작하지 못했습니다. 아래에 직접 입력해 주세요.";
}

export function Scanner({ onResult, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // 콜백이 바뀌어도 카메라를 다시 켜지 않도록 ref에 둔다.
  const resultRef = useRef(onResult);
  useEffect(() => {
    resultRef.current = onResult;
  }, [onResult]);

  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [manualErr, setManualErr] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    let fired = false;
    let controls: { stop: () => void } | undefined;

    // 스트림과 디코더 루프를 모두 멈춘다. 여러 번 불러도 안전하다.
    const stopAll = () => {
      controls?.stop();
      controls = undefined;
      const stream = video.srcObject;
      if (stream instanceof MediaStream) stream.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    };

    (async () => {
      // HTTP 접속이면 mediaDevices 자체가 없다.
      if (!navigator.mediaDevices?.getUserMedia)
        throw new DOMException("unsupported", "NotSupportedError");
      // 디코더는 카메라를 켤 때만 내려받는다.
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      // 내려받는 사이 정리됐으면(StrictMode 포함) 카메라를 켜지 않는다.
      if (cancelled) return;
      const c = await new BrowserMultiFormatReader().decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } }, audio: false },
        video,
        (result) => {
          if (!result || fired || cancelled) return;
          fired = true;
          stopAll();
          resultRef.current(result.getText());
        },
      );
      controls = c;
      // 자기 스트림만 멈춘다. 같은 video 를 쓰는 다음 실행의 스트림을 건드리지 않기 위해서다.
      if (cancelled) c.stop();
      else if (fired) stopAll();
    })().catch((e) => {
      if (!cancelled) setError(cameraError(e));
    });

    return () => {
      cancelled = true;
      stopAll();
    };
  }, []);

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    const v = manual.trim();
    if (!v) {
      setManualErr("SKU 또는 바코드를 입력해 주세요.");
      return;
    }
    setManualErr(null);
    onResult(v);
  }

  return (
    <div className="space-y-3">
      {/* 오류가 나도 video 요소는 유지하고 숨긴다. */}
      <video
        ref={videoRef}
        playsInline
        muted
        hidden={!!error}
        className="aspect-square w-full rounded-2xl bg-surface-3 object-cover"
        aria-label="카메라 화면"
      />
      {error ? (
        <p role="alert" className={errCls}>
          {error}
        </p>
      ) : (
        <p className="text-sm text-ink-2">QR 또는 바코드를 화면 가운데에 맞춰 주세요.</p>
      )}

      {error && (
        <form onSubmit={submitManual} className="space-y-2" noValidate>
          <label htmlFor="scan-manual" className="block text-sm font-medium text-ink">
            SKU 또는 바코드
          </label>
          <input
            id="scan-manual"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            className={inputCls}
            autoComplete="off"
            autoCapitalize="off"
            enterKeyHint="search"
          />
          {manualErr && (
            <p role="alert" className={errCls}>
              {manualErr}
            </p>
          )}
          <button type="submit" className={btnPrimary}>
            확인
          </button>
        </form>
      )}

      <button type="button" onClick={onClose} className={btnSecondary}>
        닫기
      </button>
    </div>
  );
}
