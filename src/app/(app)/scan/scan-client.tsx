"use client";
// /scan 화면의 상태 관리 (스캔, 해석 결과 표시, 다시 스캔)

import Link from "next/link";
import { useState } from "react";
import { badgeCls, btnPrimary, btnSecondary, cardCls, errCls } from "../items/common";
import { resolveScan, type ScanOutcome } from "./actions";
import { Scanner } from "./scanner";

type Phase =
  | { step: "scanning" }
  | { step: "resolving" }
  | { step: "result"; code: string; outcome: ScanOutcome };

export function ScanClient() {
  const [phase, setPhase] = useState<Phase>({ step: "scanning" });

  async function handle(code: string) {
    setPhase({ step: "resolving" });
    let outcome: ScanOutcome;
    try {
      outcome = await resolveScan(code);
    } catch {
      outcome = { kind: "error", message: "조회에 실패했습니다. 잠시 후 다시 시도해 주세요." };
    }
    setPhase({ step: "result", code, outcome });
  }

  const rescan = () => setPhase({ step: "scanning" });

  if (phase.step === "scanning") {
    // 닫기는 결과 없이 대기 화면으로 돌아간다.
    return <Scanner onResult={handle} onClose={() => setPhase({ step: "result", code: "", outcome: { kind: "none" } })} />;
  }
  if (phase.step === "resolving") {
    return <p className="text-sm text-ink-2" role="status">찾는 중...</p>;
  }

  const { outcome, code } = phase;
  return (
    <div className="space-y-3">
      {outcome.kind === "error" && (
        <p role="alert" className={errCls}>{outcome.message}</p>
      )}
      {outcome.kind === "none" && code && (
        <p role="alert" className={errCls}>
          &quot;{code}&quot;에 해당하는 품목이나 위치를 찾지 못했습니다. 다시 스캔해 주세요.
        </p>
      )}
      {(outcome.kind === "item" || outcome.kind === "location") && (
        <div className={`${cardCls} space-y-2`}>
          <span className={badgeCls}>{outcome.kind === "item" ? "품목" : "위치"}</span>
          <p className="break-words text-base font-bold text-ink">{outcome.title}</p>
          <p className="break-words text-sm text-ink-2">{outcome.sub}</p>
          <Link
            href={outcome.kind === "item" ? `/items/${outcome.id}` : `/locations/${outcome.id}`}
            className={btnPrimary}
          >
            상세 보기
          </Link>
        </div>
      )}
      <button type="button" onClick={rescan} className={btnSecondary}>
        다시 스캔
      </button>
    </div>
  );
}
