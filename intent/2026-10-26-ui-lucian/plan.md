# Plan: Lucian UX/UI 적용
Source: spec.md (Status: approved). Status: approved.
공통 규약은 ../2026-10-26-inventory/plan.md의 "공통 규약"을 따르되 위 spec Conflicts의 `dark:` 항목은 토큰 색으로 대체한다. Worker는 커밋하지 않는다.

## 공통 함정
- 이식은 `~/.claude/plugins/cache/lucian-uxui/lucian-uxui/1.1.0/skills/lucian-uxui/references/porting.md`를 먼저 읽는다. CLI는 `node <skill-dir>/scripts/lucian-uxui.mjs get <id> --lang ko`(`tokens`, `search`도 같은 CLI). 받은 코드만 쓰고 요소 ID를 지어내지 않는다.
- 요소 CSS는 일반 CSS 파일(`.uNNN` 범위 유지, Tailwind로 재작성 금지). 스크립트는 `useEffect`로 옮기고 window/document 리스너, 타이머, rAF, observer를 모두 정리한다(StrictMode 이중 마운트 확인).
- 고정 크기 요소는 폭 100%·`max-width:100%`로 반응형 보정하고 보고에 적는다. 360px 가로 스크롤 금지.
- 요소가 쓰는 텍스트(샘플 문구)는 앱의 실제 한국어 문구로 바꾼다. 접근성 속성은 보존한다.
- 기능(Server Action, RPC, 권한)은 바꾸지 않는다. 요소의 데모용 가짜 동작은 실제 핸들러로 연결한다.
- Next 16.4.3. `AGENTS.md`와 `node_modules/next/dist/docs/` 참고. 쿠키·Supabase를 쓰는 컴포넌트는 Suspense.

## 파일 맵
```
src/app/globals.css                         --ux-* 토큰, Tailwind 색 연결, .ux 기본 규칙
src/app/(app)/items/common.ts               공통 클래스 상수를 토큰 색으로
src/components/lucian/{side-rail,tab-bar,login-card,segmented,toast,rolling-number,empty-state,skeleton}.tsx
src/components/lucian/*.css                 요소별 CSS(범위 유지)
src/app/(app)/nav.tsx, layout.tsx           내비 교체
src/app/login/page.tsx                      로그인 카드
src/app/(app)/move/move-form.tsx            세그먼트 탭, 토스트
src/app/(app)/page.tsx                      숫자 카드, 빈 상태
src/app/(app)/**/page.tsx                   zinc·dark: 색을 토큰 색으로, 빈 상태, 스켈레톤
```

## 작업 순서와 병렬
U1(직렬) → U2와 U3 병렬(파일 겹치지 않음) → Advisor 통합 검증과 브라우저 확인.

## U1. 토큰과 전역 스타일 (U1, U2, U8)
- `tokens` 출력을 `globals.css`에 넣고 `@theme inline`으로 Tailwind 색(`bg-surface`, `text-ink`, `text-ink-2`, `border-line`, `bg-accent`, `text-accent-ink`, `bg-page` 등)과 모서리·그림자 값을 만든다. 기존 `--background`/`--foreground`는 토큰으로 대체. `.ux` 기본 규칙(포커스 링, 폰트 상속, reduced-motion)을 전역에 둔다.
- `items/common.ts`의 `btnPrimary`·`btnSecondary`·`inputCls`·`cardCls`·`errCls`·`linkCls`·`focusRing` 등을 토큰 색으로 바꾼다. 버튼 높이 44px 이상 유지.
- `src/app` 전체에서 `zinc-`, `blue-`, `red-`, `green-` 등의 색 클래스와 `dark:` 색 변형을 토큰 색으로 바꾼다(grep으로 목록 작성). 상태 색(오류, 경고, 성공)은 `danger`, `warn`, `mint` 토큰. 레이아웃·간격 클래스는 바꾸지 않는다.
- 대비 확인. 본문(ink/page, ink-2/surface), 비활성, 오류, 링크 조합의 대비를 계산해 AA 미만이면 보고하고 보정 제안.
- 완료 기준. build·tsc·lint·vitest 통과, `grep -rn "dark:" src` 에서 색 변형 0건, 360px 화면 7개 가로 넘침 없음(`/login`과 비로그인 리다이렉트 제외, 로그인이 필요한 화면은 코드로만 확인하고 못 본 것을 보고).

## U2. 내비게이션 (U3) — U1 이후
- `src/components/lucian/side-rail.tsx`(#040), `tab-bar.tsx`(#041)를 이식하고 `nav.tsx`/`layout.tsx`에 연결. 메뉴는 현재 항목(대시보드, 품목, 위치, 입출고, 이력, 가져오기/내보내기)과 로그아웃. 현재 경로 강조는 `usePathname`. 하단 탭은 4개 + 더보기(나머지)로 하고 접근성(role, aria-current, 키보드 화살표)을 유지한다. 2차에서 항목이 늘어날 것을 고려해 메뉴 정의는 배열 하나로 둔다.
- 데스크톱(md 이상)은 레일, 모바일은 탭 바. 레이아웃의 `Suspense` 구조와 `AuthGate`는 유지.

## U3. 화면 요소 (U4~U7) — U1 이후, U2와 병렬
- 로그인(#062), 입출고 세그먼트(#047 또는 #039)와 토스트(#070), 대시보드 숫자(#098), 빈 상태(#092/#088), 스켈레톤(#079), 인라인 알림(#072).
- 로그인은 `login/actions.ts`의 `useActionState` 결과에 연결하고 성공은 서버 redirect를 따른다. 토스트는 앱 전역 provider 없이 `move-form` 안 상태로 시작해도 되지만 2차에서 재사용하도록 `toast.tsx`에 `useToast` 훅을 둔다.
- 빈 상태와 스켈레톤은 `(app)` 화면의 Suspense fallback과 빈 목록 문구에 적용한다(데이터 표 자체는 바꾸지 않는다).

## 검증 총괄 (Advisor)
- diff 읽기, build·tsc·lint·vitest, grep으로 `dark:` 색과 zinc 잔존 확인.
- 브라우저. 로그인은 사용자가 직접(작업 공간 5 유지). 360/480/1024/1440에서 주요 화면 캡처, 라이트·다크(`prefers-color-scheme` 에뮬레이션), 키보드 포커스, reduced-motion 에뮬레이션.
- `/code-review`는 커밋 전.

## 커밋 단위
1. 토큰·공통 스타일 2. 내비 3. 로그인·입출고·대시보드 요소 4. 문서(1차 plan 이탈 포함).

## 계획 이탈 (코드와 같은 커밋에서 반영)
(아직 없음)

## 위험
- 이식 요소의 모션이 느린 휴대폰에서 거슬릴 수 있다. 데이터 화면에는 모션을 넣지 않는다.
- 색 전면 교체로 대비가 깨질 수 있다. U1에서 대비를 계산해 보고한다.
- U1은 거의 모든 화면 파일을 건드린다. U1이 끝나기 전에는 W8~W10을 시작하지 않는다.
