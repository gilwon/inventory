# Plan: 로그인 없이 데모로 둘러보기
Source: spec.md (Status: draft). Status: draft.
공통 규약은 ../2026-10-26-inventory/plan.md의 "공통 함정"을 따른다. Worker는 커밋하지 않는다.

## 파일 맵
```
src/lib/demo/data.ts            목 행 생성(items, locations, stock, movements, profiles)
src/lib/demo/client.ts          질의 엔진 + 목 Supabase 클라이언트(from/rpc/auth/storage)
src/lib/demo/index.ts           isDemo(), DEMO_MSG, DEMO_COOKIE
src/lib/demo/client.test.ts     질의 엔진 핵심 동작 테스트(필터·정렬·임베드·count·rpc)
src/lib/supabase/server.ts      isDemo()면 목 클라이언트 반환
src/proxy.ts                    데모 쿠키면 통과
src/app/login/actions.ts        startDemo(), exitDemo(), logout이 쿠키 삭제
src/app/login/page.tsx          로그인 버튼 밑 "데모로 둘러보기" (LoginCard 아래 또는 slot)
src/components/lucian/login-card.tsx  demoAction prop, 로그인 버튼 바로 아래 formAction 버튼
src/components/lucian/login-card.css  .u062-demo 보조 버튼 스타일
src/app/(app)/items/{new,[id]}/page.tsx, item-form.tsx  demo prop(데모는 브라우저 스토리지 업로드 생략)
src/app/(app)/layout.tsx        데모 띠 + 종료 버튼
src/app/(app)/**/actions.ts, src/app/api/import/apply/route.ts  쓰기 차단
```

## 작업
1. `data.ts`: 한국어 현실적 데이터(예: 볼트 M8, 포장 박스, 라벨 용지). uuid는 고정 문자열. 시각은 `Date.now()` 기준 상대값을 함수 안에서 계산한다.
2. `client.ts`: 테이블 배열 위에 체이닝 빌더를 만든다. 빌더는 thenable이다. 임베드는 select 문자열을 파싱해 FK(item_id→items, location_id→locations, created_by→profiles)로 붙인다. `items!inner`는 부모 없으면 행 제외. `search_items`·`low_stock_items`는 `supabase/migrations/0003_rpc.sql`·`0008_stocktake_lowstock.sql`의 SQL 의미를 읽고 그대로 옮긴다. `.ilike`는 `%` 와일드카드를 지원한다. 오류는 `{data:null,error:null}` 모양을 유지한다.
3. 지원하지 않는 질의(테이블·메서드)는 조용히 빈 값을 주지 말고 개발 중 눈에 띄게 throw한다.
4. `server.ts`·`proxy.ts`·로그인 액션·로그인 화면·레이아웃 띠를 연결한다.
5. 쓰기 차단: 각 변경 액션 맨 앞에서 `isDemo()`면 `DEMO_MSG`를 기존 오류 모양으로 반환한다. 변경 액션 목록은 `grep -rn "\"use server\"" src`로 찾고, 읽기 전용 액션(`move/actions.ts`의 검색, `scan/actions.ts`, `labels/actions.ts`)은 막지 않는다.
6. 사진 업로드(`item-form.tsx`의 브라우저 스토리지 업로드)는 데모에서 실제 Supabase로 나가면 안 된다. 데모에서는 파일 선택 안내만 두거나 업로드를 건너뛰고 저장 시 DEMO_MSG가 나오게 한다.

## 함정
- 이 Next.js는 학습 데이터와 다르다. 코드 전에 `node_modules/next/dist/docs/`의 관련 문서(쿠키, Server Actions, proxy)를 읽는다.
- `createClient()`는 `connection()`을 먼저 await한다. 순서를 바꾸지 않는다.
- `database.types.ts`의 Row 타입을 목 데이터에 쓴다. 목 클라이언트의 반환은 `as unknown as SupabaseClient<Database>`로 타입 맞춤하되 호출부는 수정하지 않는다.
- 주석은 전부 한글, 새 소스 파일 첫 줄에 역할 한 줄 주석. 한국어 문장을 콜론으로 끝내지 않는다.
- 요청 밖 파일은 고치지 않는다. 죽은 코드는 언급만 한다.

## 완료 기준
`npx tsc --noEmit`, `npm run lint`, `npm run test`, `npm run build` 통과. 쿠키 `demo=1`로 주요 화면을 실제로 열어 확인한다(`next start` + curl로 HTML 상태코드와 핵심 텍스트). 보고에 계획 이탈과 확인 못 한 항목을 적는다.

## 구현 중 계획 이탈
- 목 클라이언트에 `auth.signOut`(성공), `signInWithPassword`·`updateUser`·`storage.info`(DEMO_MSG 오류)를 추가했다. 호출부가 쓰기 때문이다.
- 사진 업로드는 브라우저에서 바로 일어나 서버 액션 순서로 막을 수 없어서, 두 품목 페이지가 `isDemo()`를 `ItemForm`의 `demo` prop으로 내려준다.
- `proxy.ts`가 `@/lib/demo`에서 상수를 가져와 `next/headers`가 함께 번들된다. 빌드와 실행은 통과했다.
- 검증은 `next start` + `demo=1` 쿠키 curl로 주요 화면 200과 데모 띠를 확인했다. 브라우저 눈 확인(모바일 레이아웃)은 미확인이다.
