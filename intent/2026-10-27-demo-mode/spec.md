# Spec: 로그인 없이 데모로 둘러보기
Source: intent.md (Status: draft)

## Requirements
- R1 `/login`의 로그인 버튼 바로 아래에 "데모로 둘러보기" 버튼이 있다. 로그인 폼 제출과 별개로 동작한다(이메일·비밀번호 없이 누를 수 있다).
- R2 누르면 데모 쿠키(`demo=1`, httpOnly, sameSite lax, path `/`, 세션 쿠키)가 설정되고 `/`로 이동한다.
- R3 데모 쿠키가 있으면 `proxy.ts`는 Supabase 인증을 호출하지 않고 요청을 통과시킨다. `/login`도 그대로 보여 준다(데모에서 나갈 수 있어야 한다).
- R4 데모 쿠키가 있으면 서버용 `createClient()`가 실제 Supabase 대신 메모리 목 클라이언트를 돌려준다. 앱 화면 코드(`(app)/**`, `api/**`, `lib/auth.ts`)는 그대로 목 데이터를 읽는다.
- R5 목 클라이언트는 현재 코드가 쓰는 질의 표면을 지원한다. 테이블 `items`·`locations`·`movements`·`profiles`·`stock`, 체이닝 `select/eq/neq/in/is/not/gt/gte/lte/ilike/order/range/limit/single/maybeSingle`(`count:"exact"`, `head:true` 포함), 임베드 관계(`items(...)`, `items!inner(...)`, `locations(...)`, `profiles(...)`), RPC `low_stock_items`·`search_items`, `auth.getUser()`(관리자 데모 사용자), 스토리지 `createSignedUrl`(사진 없음으로 처리).
- R6 데모 사용자는 role=admin이라 모든 화면(사용자 관리, 가져오기·내보내기 포함)이 보인다.
- R7 데모에서 쓰기(품목·위치 저장, 활성 토글, 이동·조정·실사, 이력 되돌리기, 사용자 생성·권한 변경, 비밀번호 변경, 엑셀 가져오기, 사진 업로드)는 저장하지 않고 "데모에서는 저장되지 않습니다."를 화면에 보인다. 읽기성 기능(검색, 스캔 해석, 라벨 만들기, 엑셀 내보내기, 가져오기 미리보기)은 목데이터로 동작한다.
- R8 데모 중에는 앱 레이아웃 위쪽에 "데모 모드입니다. 입력한 내용은 저장되지 않습니다." 띠와 "데모 종료" 버튼이 있다. 종료하면 데모 쿠키를 지우고 `/login`으로 간다.
- R9 로그아웃 액션도 데모 쿠키를 지운다.
- R10 목데이터 규모: 품목 12개 안팎(일부는 최소수량 미만이라 부족 품목 카드에 보임, 일부 비활성), 위치 8개 안팎(2단계 계층), 재고 행, 이력 25건 안팎(입고·출고·이동 쌍(group_id)·조정·되돌린 건 포함), 프로필 3명. 시각은 현재 시각 기준 상대값이다.

## Design
- `src/lib/demo/data.ts` 목 행 생성(현재 시각 기준), `src/lib/demo/client.ts` 질의 엔진과 목 클라이언트, `src/lib/demo/index.ts`의 `isDemo()`(cookies에서 `demo` 확인)와 `DEMO_MSG`.
- `src/lib/supabase/server.ts`의 `createClient()`가 `isDemo()`면 목 클라이언트를 돌려준다. `connection()` 호출 뒤에 판단한다.
- 브라우저용 `src/lib/supabase/client.ts`는 건드리지 않는다. 사진 업로드는 서버 쪽 데모 검사로 막고, 클라이언트 업로드 경로는 데모에서 비활성 안내만 한다.
- 쓰기 차단은 각 변경 Server Action·API 라우트 맨 앞의 `isDemo()` 검사로 한다. 반환 모양은 해당 액션의 기존 오류 모양을 따른다.

## Decisions
- 실제 Supabase에 데모 계정을 두지 않는다. 이유는 데모 방문자가 실데이터에 닿는 경로를 코드 수준에서 아예 없애기 위해서다.
- 쓰기는 메모리에 반영하지 않고 막는다. 서버리스에서는 요청 사이에 메모리가 유지되지 않아 반영이 보이지 않거나 인스턴스마다 달라지기 때문이다.
- 데모 쿠키는 인증이 아니다. 쿠키가 있어도 `createClient()`가 목 클라이언트만 주므로 실데이터는 읽히지 않는다. 단, 쿠키를 직접 읽는 다른 Supabase 호출 경로(proxy 제외)가 없는지 확인한다.

## Conflicts
- `proxy.ts` 주석("로그인하지 않은 요청을 /login 으로 보낸다")에 데모 예외를 반영한다.

## Acceptance
- `/login`에서 버튼을 누르면 `/`로 들어가 대시보드에 목데이터(활성 품목 수, 부족 품목, 최근 이력)가 보인다.
- 품목·위치·이력·재고 실사·이동·라벨·스캔·가져오기/내보내기·사용자 관리 화면이 오류 없이 열린다.
- 저장 동작을 누르면 "데모에서는 저장되지 않습니다."가 보이고 아무것도 바뀌지 않는다.
- "데모 종료" 후 데모 쿠키가 지워지고 `/`는 다시 `/login`으로 간다.
- 데모 쿠키 상태에서 실제 Supabase로 나가는 요청이 없다.
