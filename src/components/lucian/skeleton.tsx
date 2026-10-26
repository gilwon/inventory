// Lucian UX/UI Prompt #079 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#079
// 데이터를 불러오는 동안 보이는 목록형 스켈레톤(Suspense fallback). 서버 컴포넌트에서도 쓴다.

import "./skeleton.css";

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="ux u079" role="status" aria-busy="true">
      <span className="sr-only">불러오는 중...</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="u079-card" aria-hidden="true">
          <div className="u079-s u079-av">
            <span className="u079-sk" />
          </div>
          <div className="u079-tx">
            <div className="u079-s">
              <span className="u079-sk" />
            </div>
            <div className="u079-s">
              <span className="u079-sk" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
