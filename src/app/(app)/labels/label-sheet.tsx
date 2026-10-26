"use client";
// 선택한 라벨을 A4 격자로 보여 주는 미리보기·인쇄 영역
import type { Label } from "./actions";
import "./labels.css";

export function LabelSheet({ labels }: { labels: Label[] }) {
  return (
    <ul className="label-sheet" aria-label="라벨 미리보기">
      {labels.map((l) => (
        <li key={l.key} className="label-cell">
          {/* svg는 qrcode 라이브러리가 만든 숫자 경로뿐이라 안전하다. */}
          <div className="label-qr" aria-hidden="true" dangerouslySetInnerHTML={{ __html: l.svg }} />
          <div className="label-text">
            <p className="label-name">{l.name}</p>
            <p className="label-code">{l.code}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
