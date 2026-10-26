"use client";
// 선택한 라벨을 A4 격자로 보여 주는 미리보기·인쇄 영역
import type { Label } from "./actions";
import "./labels.css";

export function LabelSheet({ labels }: { labels: Label[] }) {
  return (
    <ul className="label-sheet" aria-label="라벨 미리보기">
      {labels.map((l) => (
        <li key={l.key} className={`label-cell${l.format === "barcode" ? " label-cell--barcode" : ""}`}>
          {/* svg는 qrcode·bwip-js 라이브러리가 만든 도형 경로뿐이고, 사용자 입력(SKU·위치 코드)은 인코딩 입력으로만 쓰여 SVG 마크업에 글자로 들어가지 않아 안전하다. */}
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
