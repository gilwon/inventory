# Plan: 입출고 이력 달력
Source: spec.md (Status: draft). Status: draft.
공통 규약은 ../2026-10-26-inventory/plan.md의 "공통 함정"을 따른다. Worker는 커밋하지 않는다.

## 파일 맵
```
src/lib/calendar.ts                 날짜 계산·집계 순수 함수
src/lib/calendar.test.ts            순수 함수 테스트(윤년 2월, 월 경계, KST 자정 직전·직후, 이동 1건 집계)
src/app/(app)/calendar/page.tsx     서버 컴포넌트, ?m 검증, movements 조회, 격자 렌더
src/app/(app)/nav.tsx               "이력" 다음에 "달력" 항목 추가(아이콘은 기존 항목처럼 path)
```

## 작업
1. `calendar.ts`와 테스트를 먼저 만든다. 날짜 계산은 Date.UTC 기반으로 해서 실행 환경 시간대에 영향받지 않게 한다. 현재 KST 날짜는 `format.ts`의 kstFormatter 방식을 참고한다(새 포매터가 필요하면 같은 옵션으로 만든다).
2. `page.tsx`는 `history/page.tsx`의 패턴을 따른다(`searchParams` 비동기, `Suspense` + `ListSkeleton`, `createClient`, `EmptyState`/`InlineAlert`). 디자인 레포의 `month-view.tsx` 구조(요일 헤더, 격자, 날짜 칸)를 참고하되 Tailwind 클래스와 기존 토큰(`bg-surface`, `border-line`, `text-ink-2`, `text-inbound`, `text-danger` 등)으로 다시 쓴다. 디자인 레포 파일을 복사하지 않는다.
3. 칩 색은 `moveTone` 규칙을 따른다(입고 text-inbound, 출고 text-danger, 나머지 중립). 색만으로 구분하지 않고 글자도 함께 둔다.
4. 월 이동·오늘 링크는 `min-h-11`. 날짜 칸 링크에 `focus-visible:ring-2 focus-visible:ring-accent`.
5. `nav.tsx`에 항목만 추가한다. 모바일 탭(TAB_HREFS)은 바꾸지 않는다.

## 함정
- 이 Next.js는 학습 데이터와 다르다. 코드 전에 `node_modules/next/dist/docs/`의 searchParams, 서버 컴포넌트 문서를 읽는다.
- Supabase 한 요청 기본 상한이 1000행이다. 반드시 `range`로 이어 읽는다. 정렬은 `created_at`, `id` 순으로 고정해 페이지 사이 중복·누락이 없게 한다.
- 데모 클라이언트(`src/lib/demo/client.ts`)가 쓰는 질의(gte, lte, order, range, select 컬럼 목록)를 지원하는지 확인하고, 미지원이면 호출부를 바꾸지 말고 보고한다.
- 이동은 transfer_out/transfer_in 두 행이다. transfer_out만 센다.
- 주석은 전부 한글, 새 소스 파일 첫 줄에 역할 한 줄 주석. 한국어 문장을 콜론으로 끝내지 않는다.
- 요청 밖 파일은 고치지 않는다. 죽은 코드는 언급만 한다.

## 완료 기준
`npx tsc --noEmit`, `npm run lint`, `npm run test`, `npm run build` 통과. `demo=1` 쿠키로 `next start` 후 `/calendar`와 `/calendar?m=2026-02`, `/calendar?m=abc`가 200이고 핵심 텍스트가 보이는지 curl로 확인한다. 보고에 계획 이탈과 확인 못 한 항목을 적는다.

## 구현 중 계획 이탈
- 이번 달 밖 날짜 칸은 건수를 세지 않아 0건으로 오해되므로 링크 없이 흐린 칸으로만 둔다(spec의 "날짜 칸 전체가 링크"는 이번 달 칸에 적용).
- 5000행 안내는 5번째 페이지가 1000행으로 가득 차면 띄운다(정확히 5000건이어도 뜬다).
- 시각 디자인을 디자인 레포 월 보기 모양으로 전면 교체했다(헤더 제목·보조줄·오늘·이전/다음 분할 컨트롤, 헤어라인 격자, 이벤트 칩, 모바일 색 점). 칩 색은 `moveTone` 토큰 대신 이 화면 전용 `calendar.css`의 `--cal-event-*` 팔레트를 쓴다.
- 입출고 내역 패널을 추가했다(spec 추가 사양). 파일 맵에 `src/app/(app)/calendar/kinds.ts`(칩 종류·색 매핑 공유)와 `recent-panel.tsx`(서버 컴포넌트)가 늘었고, `calendar.ts`에 `kstLabel`이 늘었다.
- 월 계산을 `CalendarLayout`으로 옮겨 달력과 패널이 각자 Suspense로 읽는다. `.cal`은 달력 루트가 아니라 이 래퍼에 있다.
- 패널 304px을 넣으면 달력이 좁아져 페이지 컨테이너를 `max-w-5xl xl:max-w-7xl`로 넓혔다.
- 톤앤매너를 이 앱의 다른 화면에 맞췄다. 칩 색은 앱 토큰(`bg-inbound/10 text-inbound`, `bg-danger/10 text-danger`, 중립 `bg-surface-3 text-ink-2`)으로 되돌렸고 `calendar.css`는 삭제했다(앞선 `--cal-event-*` 팔레트 이탈 항목은 폐기). 격자와 패널은 `rounded-2xl border border-line bg-surface` 카드 하나 안에 둔다.
- 이번 달 날짜 칸은 `/history`가 아니라 `/calendar?m&d` 링크다(`parseDay` 추가). 패널이 그날 내역(최대 50건)을 보이고 `/history`로 가는 길은 패널 맨 아래 링크다. 모바일에서는 패널이 달력 아래라 스크롤이 필요하다(한계).
