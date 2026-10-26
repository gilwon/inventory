// Lucian UX/UI Prompt #092 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#092
// 목록이 비었을 때 보이는 빈 상태(빈 선반과 돋보기 그림, 제목, 보조 문구). 서버 컴포넌트에서도 쓴다.

import "./empty-state.css";

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="ux u092-none">
      <div className="u092-art" aria-hidden="true">
        <svg viewBox="0 0 150 92">
          <path className="u092-shelf" d="M8 30h134M8 56h134M8 82h134" />
          <g className="u092-lens">
            <circle cx="34" cy="38" r="20" />
            <path className="gl" d="M24 30a12 12 0 0 1 8-5" />
            <path d="M48 52l14 14" />
          </g>
        </svg>
      </div>
      <p className="u092-nt">{title}</p>
      <p className="u092-ns">{description ?? ""}</p>
    </div>
  );
}
