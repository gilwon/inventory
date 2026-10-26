# Plan: 모바일 햄버거 메뉴, 헤더 제목 키우기, PWA 설치
Source: spec.md (Status: draft). Status: draft.
공통 규약은 ../2026-10-26-inventory/plan.md와 ../2026-10-26-ui-lucian/plan.md의 "공통 함정"을 따른다. Worker는 커밋하지 않는다.

## 공통 함정
- `AGENTS.md`대로 `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`와 `.../03-file-conventions/01-metadata/manifest.md`, icon 문서를 먼저 읽는다. Next 16 규약(`manifest.ts`, `icon`, `apple-icon`, `viewport`의 `themeColor`)을 따른다.
- 서비스 워커는 재고 데이터를 절대 캐시하지 않는다. fetch 핸들러는 `request.mode === "navigate"`의 네트워크 실패에서만 `/offline`을 돌려주고 나머지는 건드리지 않는다.
- `manifest`는 쿠키 없이 요청될 수 있어 `proxy.ts` 매처에서 제외해야 한다. 제외하지 않으면 `/login`으로 리다이렉트되어 설치가 깨진다.
- `/offline`은 쿠키·Supabase를 쓰지 않는 정적 페이지다. `(app)` 레이아웃 밖에 둔다(AuthGate 회피).
- Lucian 이식은 `~/.claude/plugins/cache/lucian-uxui/lucian-uxui/1.1.0/skills/lucian-uxui/references/porting.md`를 먼저 읽고 CLI `search`로 햄버거·드로어 요소를 찾아 `get`으로 받은 코드만 쓴다. 지어내지 않는다.

## 파일 맵
```
src/app/(app)/layout.tsx                    모바일 헤더 재구성(햄버거, 큰 제목, 테마 버튼)
src/components/lucian/hamburger-menu.{tsx,css}   햄버거와 전체 메뉴(이식 또는 토큰으로 제작)
src/app/(app)/nav.tsx                       메뉴 연결(NAV_ITEMS 재사용, logout)
src/app/manifest.ts                         웹 앱 매니페스트
src/app/icon.png, apple-icon.png 또는 public/  아이콘(192, 512, 마스크 가능, 180)
src/app/layout.tsx                          viewport themeColor(라이트·다크), 애플 웹앱 메타
public/sw.js                                오프라인 안내용 서비스 워커
src/components/sw-register.tsx              서비스 워커 등록(클라이언트)
src/app/offline/page.tsx                    오프라인 안내 페이지
src/proxy.ts                                매처 제외(manifest, 아이콘, sw.js, offline)
PRODUCT.md                                  오프라인 예외 문구
```

## 작업 순서와 병렬
P1(헤더·햄버거)과 P2(PWA)는 파일이 겹치지 않아 병렬이다. 겹치는 곳은 `src/app/layout.tsx`(P2만 수정)와 `(app)/layout.tsx`(P1만 수정)다.

## P1. 햄버거 메뉴와 제목 (R1~R4)
- 헤더는 `md:hidden`. 햄버거(44px), 제목(`text-2xl font-bold`, 필요하면 앱 아이콘 로고와 함께), 테마 토글 순서. 360px에서 `truncate` 없이 한 줄이 되는지 확인한다.
- 메뉴는 `NAV_ITEMS` 전체와 로그아웃. 포커스 트랩과 Esc, 바깥 누르기, `aria-current`, reduced-motion 처리. 본문 스크롤 잠금은 열려 있는 동안만.
- 완료 기준. build·tsc·lint·vitest 통과, 360px 가로 넘침 0, 라이트·다크 확인, 하단 탭 바 동작 그대로.

## P2. PWA (R5~R9)
- `manifest.ts`, 아이콘 생성(파이썬 PIL 또는 `next/og` ImageResponse 등 사용 가능한 도구로 PNG 생성, 마스크 가능 아이콘은 안전 영역 80%), 루트 `viewport.themeColor`와 애플 메타.
- `public/sw.js`는 install에서 `/offline`을 캐시하고 activate에서 이전 캐시를 지운다. `sw-register`는 production 또는 localhost에서만 등록.
- `proxy.ts` 매처에 `manifest.webmanifest`, `sw.js`, `offline`, 아이콘 경로를 제외로 추가. 매처 변경은 이 파일의 유일한 변경이다.
- 완료 기준. build·tsc·lint·vitest 통과, 로그아웃 상태에서 보호 경로는 307, 제외 경로는 200(curl), Chrome DevTools Application에서 매니페스트 오류 없음(가능하면).

## 검증 총괄 (Advisor)
- diff 읽기, curl로 로그아웃 상태 경로 응답, 브라우저(로그인은 사용자가)로 360px 헤더·메뉴, 오프라인은 CDP `Network.emulateNetworkConditions`로 확인.
- 코드 리뷰와 푸시 전 보안 리뷰(proxy 매처 변경이 인증 우회를 만들지 않는지 포함).

## 커밋 단위
1. 문서와 PRODUCT.md 문구 2. 햄버거와 제목(P1) 3. PWA(P2).

## 위험
- 서비스 워커 캐시 범위가 넓어지면 낡은 재고가 보인다. `/offline`과 그 자산만 캐시한다.
- 매처 제외가 넓으면 인증을 우회한다. 제외는 정확한 경로만 쓴다.
- iOS Safari는 설치 UX가 달라 아이콘·`apple-touch-icon` 메타를 직접 확인하지 못한다.
