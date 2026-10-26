# Intent: Lucian UX/UI 적용
Author: gilwon, 소유자. Status: approved.

## Problem
앱의 화면은 Tailwind 기본 회색조(zinc)와 파란 버튼으로 기능만 갖춘 상태다. 시각적 통일감이 없고 내비게이션, 피드백(기록 완료·오류), 빈 화면, 로딩 표시가 밋밋하다.

## Proposed outcome
https://lucianlabs.dev/uxui-prompt/ 의 UX/UI 라이브러리를 적용해 앱 전체가 같은 색·모서리·그림자·동작을 가진다. 라이트와 다크가 모두 자연스럽고, 모바일(360px)과 데스크톱이 모두 쓰기 좋다. 재고 데이터(수량, 위치, 이력)를 읽는 속도는 지금보다 떨어지지 않는다.

## Affected users and systems
앱을 쓰는 모든 사용자. 모든 `(app)` 화면, 로그인, 전역 스타일.

## Constraints
- 데이터 우선. 표·목록·수량은 장식보다 읽기가 앞선다. 모션이 입력이나 읽기를 가로막지 않는다.
- 색 대비 WCAG AA, 포커스 링, 키보드 사용, `prefers-reduced-motion`을 지킨다.
- Lucian 요소는 `get`으로 받은 코드만 쓰고 MIT 라이선스 첫 줄 주석을 각 컴포넌트 파일 맨 위에 둔다. 요소 ID를 지어내지 않는다.
- 기능과 데이터 흐름(Server Action, RPC, 권한)은 바꾸지 않는다. 화면 표현만 바꾼다.
- 한국어 문구, 360px 가로 스크롤 없음.
- 2차 개발(W7~W10)이 새 화면을 만들기 전에 공통 토큰과 컴포넌트가 준비되어야 한다.

## Open questions
- Lucian의 기본 보라 계열 강조색을 그대로 쓸지, 재고 앱에 맞게 바꿀지. 이 문서는 라이브러리 색을 그대로 쓰는 것으로 둔다.
