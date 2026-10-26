# Plan: 재고 관리 웹앱 1차
Source: intent.md, spec.md (둘 다 approved). 범위는 1차 R1~R3, R5~R21, R23, R28~R35.
Status: approved. Worker에게 넘긴다.

## 공통 규약 (모든 Worker 브리프에 붙인다)
- 모든 응답과 UI 문구는 한국어. 코드 주석은 전부 한글.
- 새 소스 파일(.ts/.tsx/.sql/.css)의 첫 줄에 역할 한 줄 주석. 설정 파일(json, config, .env.example 등)은 제외. tsx/ts는 `// 역할` 형식, sql은 `-- 역할`.
- 한국어 문장(주석·UI 문구 포함)을 콜론으로 끝내지 않는다.
- 요청 범위 밖은 고치지 않는다. 발견한 문제는 보고서에 적는다.
- Worker는 커밋하지 않는다. Advisor가 검증 후 커밋한다.
- 임시 검증 스크립트는 `/private/tmp/claude-501/-Users-gilwon-dev-inventory/942278a7-eff9-4e51-8421-fd472397bfa1/scratchpad/`에 두고 저장소에 남기지 않는다.
- UI 작업 전 design-quality-check 스킬의 점검표(대비, 포커스 상태, 480/1024/1440 반응형, 키보드 이동)를 따른다.
- 시간은 UTC로 저장하고 표시할 때만 KST(Asia/Seoul)로 바꾼다.
- 수량은 정수. 날짜 표시는 `lib/format.ts`의 함수만 쓴다.

## 스택과 버전
Next.js(App Router, TypeScript, Tailwind), `@supabase/ssr`, `@supabase/supabase-js`, `exceljs`(엑셀 읽기·쓰기), `vitest`(순수 로직 테스트 1개 파일). 패키지 관리자는 npm. Next.js 버전은 scaffold 시점의 최신을 쓰고, 설치된 버전의 `node_modules/next/dist/docs`(있으면)와 공식 문서로 API를 확인한다. 요청 가로채기 파일 이름(`middleware.ts` 또는 `proxy.ts`)은 설치된 버전 문서를 따른다.
환경변수는 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. 서비스 롤 키는 쓰지 않는다.

## 파일 맵
```
supabase/migrations/0001_schema.sql      테이블, 인덱스, 제약, 트리거
supabase/migrations/0002_rls_storage.sql RLS 정책, 권한 회수, 사진 버킷
supabase/migrations/0003_rpc.sql         record_*, reverse_movement, import_apply, search_items
src/proxy.ts (또는 middleware.ts)         세션 갱신, 미로그인 시 /login 이동
src/lib/supabase/{server,client}.ts      Supabase 클라이언트 생성
src/lib/database.types.ts                Advisor가 생성
src/lib/format.ts                        KST 표시, 수량 표시
src/lib/excel/{schema,parse,validate,build}.ts, validate.test.ts
src/app/layout.tsx, globals.css
src/app/login/{page.tsx,actions.ts}
src/app/(app)/layout.tsx                 로그인 확인, 하단/상단 내비게이션
src/app/(app)/page.tsx                   대시보드
src/app/(app)/items/{page.tsx,new/page.tsx,[id]/page.tsx,item-form.tsx,actions.ts}
src/app/(app)/locations/{page.tsx,[id]/page.tsx,location-form.tsx,actions.ts}
src/app/(app)/move/{page.tsx,move-form.tsx,actions.ts}
src/app/(app)/history/{page.tsx,reverse-button.tsx,actions.ts}
src/app/(app)/import-export/{page.tsx,import-panel.tsx}
src/app/api/import/{template,preview,apply}/route.ts
src/app/api/export/route.ts
.env.example, .gitignore, README.md(실행 방법 10줄 이내)
```

## 작업 순서와 병렬
```
S0 (Advisor) git init, Supabase 프로젝트, 승인 필요 항목
   ├─ W1 scaffold·인증·내비 ───────────────┐
   └─ W2 DB 마이그레이션 ─ S1(Advisor) 적용·타입 생성·SQL 검증
                                            ├─ W3 품목·위치 화면
                                            ├─ W4 이동·조정·이력 화면
                                            └─ W5 엑셀 가져오기·내보내기
                                                     └─ W6 대시보드 (W3,W4 후)
```
W1과 W2는 파일이 겹치지 않으므로 동시에 띄운다. W3·W4·W5는 서로 다른 디렉터리만 건드리므로 W1과 S1이 끝난 뒤 동시에 띄운다. 공용 파일(`lib/format.ts`, 내비)은 W1이 만들고 이후 Worker는 수정하지 않는다. 필요하면 보고서에 요청 사항으로 적는다.

## S0. Advisor 선행 작업
1. 작업 폴더에서 `git init`, 첫 커밋은 intent 문서 3종만.
2. Supabase 새 프로젝트 비용을 확인해 사용자에게 알리고 승인받은 뒤 `create_project`. 리전은 서울(ap-northeast-2)이 가능하면 그것으로. 승인 전에는 만들지 않는다.
3. 사용자 수동 작업을 안내한다. 인증 설정의 "Allow new users to sign up" 끄기, 첫 계정 생성(대시보드의 Authentication > Users). 이 두 가지는 MCP로 못 하면 사용자가 한다.
4. `get_project_url`, `get_publishable_keys`로 `.env.local` 값 확보(채팅에 키를 길게 출력하지 않는다).

## W1. scaffold, 인증, 내비 (R1, R2, R34)
**할 일**
- `create-next-app`(TypeScript, Tailwind, App Router, src 디렉터리, ESLint, npm)로 현재 폴더에 만든다. `intent/`와 `supabase/`는 건드리지 않는다.
- 위 파일 맵의 `lib/supabase/*`, 프록시(미로그인 사용자를 `/login`으로 보냄), `login`, `(app)/layout.tsx`, `lib/format.ts`, `.env.example`, `.gitignore`(`.env*.local` 포함), README를 만든다.
- 로그인은 이메일+비밀번호 Server Action. 가입 화면·링크를 만들지 않는다. 오류는 한국어로.
- `(app)/layout.tsx`는 모바일 하단 탭(대시보드, 품목, 위치, 입출고, 이력)과 PC 상단/좌측 내비, 로그아웃 버튼을 가진다. 가져오기/내보내기 링크는 더보기 영역에 둔다. 아직 없는 페이지는 "준비 중" 자리표시 페이지를 만들지 말고 링크만 걸어 둔다(404 허용, W3~W6이 채움).
- `lib/format.ts`에 `formatKst(iso)`, `formatQty(n, unit)`을 둔다.
**완료 기준**
- `npm run build`와 `npx tsc --noEmit`, `npm run lint` 통과.
- 로그인 없이 `/`를 열면 `/login`으로 이동한다(로컬 `npm run dev`로 확인).
- 360px 너비에서 로그인·내비에 가로 스크롤이 없다.
**함정**
- 서버에서 세션 확인은 `getUser()`를 쓴다(`getSession()`만 믿지 않는다).
- `.env.local`을 만들거나 읽지 않는다(없어도 build가 통과해야 한다. 환경변수는 요청 시점에 읽는다).

## W2. DB 마이그레이션 (R5, R7~R9, R12~R18, R20, R21, 사진 버킷)
**파일** `supabase/migrations/0001~0003`. 적용은 Advisor가 한다(Worker는 파일만 쓴다).
**0001 스키마**
- 확장 `citext` 사용 가능하면 쓰고, 아니면 `lower()` 유일 인덱스. 위치 `code`, 품목 `sku`, `barcode`는 대소문자 무시 유일(바코드는 null 허용). sku와 code는 `trim` 후 빈 문자열 금지 체크.
- `profiles(id uuid pk references auth.users on delete cascade, display_name, role text check in ('admin','worker') default 'worker')`. `auth.users` insert 트리거가 프로필을 만들고, 첫 프로필이면 `admin`.
- `locations(id, parent_id references locations, code, name, active default true, created_at)`.
- `items(id, sku, name, barcode, unit default '개', min_qty int default 0 check >=0, memo, photo_path, active default true, created_at)`.
- `stock(item_id, location_id, qty int not null check (qty >= 0), pk(item_id, location_id))`.
- `movements(id bigint identity, item_id, location_id, type check in ('receive','issue','transfer_out','transfer_in','adjust','import'), delta int not null check (delta <> 0), reason text, group_id uuid, reverses_id bigint unique references movements, created_by uuid default auth.uid() references profiles, created_at timestamptz default now())`. `adjust` 유형은 `reason`이 공백 제외 1자 이상이어야 한다는 체크 제약.
- 트리거 `locations` 순환 방지(자기 자신과 자기 후손을 상위로 지정 금지), 활성 하위 위치나 수량이 남은 품목이 있으면 `active=false` 금지. `items`는 어떤 위치든 `qty>0`이면 `active=false` 금지.
- 인덱스 `movements(item_id, created_at desc)`, `movements(location_id, created_at desc)`, `movements(created_at desc)`, `stock(location_id)`.
**0002 RLS와 권한**
- 모든 테이블 RLS 활성. `select`는 `authenticated`에 허용. `items`, `locations`는 1차에 `authenticated`가 insert/update 가능(2차에 role로 분기, 주석으로 명시). delete 정책은 두지 않는다.
- `stock`, `movements`는 insert/update/delete 정책을 만들지 않고, `revoke insert, update, delete`를 `anon`, `authenticated`에서 회수한다.
- 비공개 버킷 `item-photos`(5MB, 이미지 MIME만). 정책은 `authenticated`의 읽기·업로드·교체.
**0003 함수** 모두 `security definer`, `set search_path = ''`, 첫 줄에서 `auth.uid() is null`이면 예외, `grant execute`는 `authenticated`에만. 오류 메시지는 한국어로 구분 가능한 문구("재고가 부족합니다", "보관된 품목입니다" 등).
- `record_receive(item, location, qty, reason)`, `record_issue(...)`, `record_transfer(item, from, to, qty, reason)`: qty는 양의 정수만. 품목·위치가 비활성이면 거절. `stock` 행은 `insert ... on conflict do update`로 갱신하고 행 잠금을 건다. 이동은 같은 `group_id`로 두 행.
- `record_adjust(item, location, actual_qty, reason)`: 사유 필수, 차이가 0이면 아무것도 기록하지 않고 0을 반환.
- `reverse_movement(movement_id)`: 이미 정정된 행, 정정 행 자체는 거절. 이동 행은 같은 `group_id`의 두 행을 함께 정정. 한 행이라도 음수가 되면 전체 롤백.
- `import_apply(payload jsonb)`: `{locations:[{code,name,parent_code}], items:[{sku,name,barcode,unit,min_qty,memo}], stocks:[{sku,location_code,qty}]}`. 위치(없는 코드만 생성, 상위 먼저), 품목(신규 insert, 기존 SKU는 정보 갱신), 수량(`stock` 행이 없거나 qty 0인 조합만 `import` 유형 입고, 이미 있으면 건너뜀)을 한 트랜잭션으로. 결과로 생성·갱신·무시 건수를 반환.
- `search_items(q text, lim int, off int, include_archived boolean default false)`: 보관 품목은 기본 숨김(W3 목록의 "보관 포함" 필터만 true). 다음 페이지 유무는 `lim+1`건을 요청해 판단한다. SKU·바코드 정확 일치 우선, 그다음 SKU·이름·바코드 부분 일치(`ilike`, 입력의 `%`·`_`는 이스케이프). 반환 열은 품목 열 + `total_qty`. `q`가 비면 전체를 이름순.
- `verify_stock_ledger()`: 이력 합과 `stock`이 다른 (item, location)을 반환(R20 검증용, 읽기 전용).
**완료 기준** 파일이 문법 오류 없이 작성됨. 실제 검증은 S1에서 Advisor가 한다.
**함정**
- 함수 안에서 `stock`/`movements` 접근은 스키마를 명시한다(`public.`), `search_path`가 비어 있기 때문.
- 같은 (item, location)의 동시 입력 직렬화는 `select ... for update`가 아니라 `insert ... on conflict do update`의 행 잠금 + 갱신 후 `qty<0` 체크 제약으로 보장한다. 선검사만 믿지 않는다.
- 이동에서 출발·도착 위치가 같으면 거절.

## S1. Advisor: 적용과 SQL 검증
1. 마이그레이션 3개를 `apply_migration`으로 순서대로 적용, `get_advisors`로 보안 경고 확인.
2. `generate_typescript_types` 결과를 `src/lib/database.types.ts`로 저장.
3. `execute_sql`로 spec Acceptance 2, 3, 4, 5, 6, 7과 R16·R17·R20을 시나리오로 검증(테스트 사용자 JWT는 `set_config('request.jwt.claims', ...)`로 흉내). 테스트 데이터는 검증 후 삭제한다.
4. 실패하면 W2 수정 브리프를 다시 위임한다.

## W3. 품목·위치 화면 (R5~R13)
**파일** `items/*`, `locations/*`.
- `/items` 검색창+목록(50건 페이지네이션, `search_items` RPC), 행에 SKU, 이름, 합계, 단위, 보관 여부. 보관 품목은 기본 숨김, 필터로 표시.
- `/items/new`, `/items/[id]`(상세·수정): 폼 필드는 spec R9. 상세에 위치별 수량 표, 합계, 해당 품목 최근 이력 20건, 사진(서명 URL), 보관/복원 버튼. 사진 업로드는 5MB·이미지 검증을 클라이언트와 서버 양쪽에서.
- `/locations` 트리 표시(들여쓰기 목록), 코드 검색, 생성·수정(상위 선택, 자기 후손은 선택지에서 제외), 보관/복원.
- `/locations/[id]` 해당 위치의 품목별 수량 목록과 하위 위치 링크.
- 모든 쓰기는 Server Action. 제약 위반(중복 SKU, 중복 바코드, 보관 불가)은 DB 오류 메시지를 한국어 안내로 바꿔 폼에 표시.
**완료 기준** 빌드·린트·타입 통과. 수동 확인은 Advisor가 브라우저로 한다(Acceptance 5, 6).
**함정**
- 검색어를 쿼리 문자열에 직접 붙이지 않는다(RPC 파라미터로만).
- 위치 경로("창고 > 선반 > 칸") 문자열은 Advisor가 만든 `src/lib/location-path.ts`의 `buildLocationPaths(locations)`를 W3·W4·W5 모두 그대로 쓴다. 수정하지 않는다.

## W4. 입출고·이동·조정·이력 (R14~R21, R35)
**파일** `move/*`, `history/*`.
- `/move` 한 화면에 입고·출고·이동·조정 탭. 품목은 SKU/이름 검색 선택(`search_items`), 위치는 활성 위치 선택(경로 표시). 수량은 `inputmode="numeric"`, 사유는 선택(조정은 필수).
- 출고·이동 시 선택한 품목×위치의 현재 수량을 보여 주고, 초과 입력은 제출 전 안내 + 서버 오류도 한국어로 표시.
- 성공하면 같은 화면에 결과 토스트와 "같은 품목으로 계속" 상태 유지(화면 전환 없음, R35).
- `/history` 최신순 50건 페이지네이션, 필터(기간, 품목 검색, 위치, 유형, 작업자). 각 행에 시각(KST), 품목, 위치, 유형 라벨, 증감(+/-), 사유, 작업자, "정정" 버튼(이미 정정됨/정정 행은 숨김). 이동은 묶음 표시.
**완료 기준** 빌드·린트·타입 통과. Advisor가 Acceptance 2, 3, 4, 7을 화면에서 확인.
**함정**
- 모든 수량 변경은 RPC만 호출한다. `stock`·`movements`에 직접 쓰지 않는다(권한도 없다).
- 이력 행에 수정·삭제 UI·API를 만들지 않는다.
- 작업자 이름은 `profiles.display_name`, 없으면 이메일 앞부분.

## W5. 엑셀 가져오기·내보내기 (R28~R33)
**파일** `lib/excel/*`, `import-export/*`, `api/import/*`, `api/export/route.ts`.
- `schema.ts` 시트·열 이름 상수와 행 타입. `parse.ts` 업로드 버퍼를 읽어 행 배열로(셀 값은 문자열 trim, 수량은 숫자/문자 둘 다 받아 검증은 `validate.ts`에서). `build.ts` 양식 파일, 내보내기 파일 생성. `validate.ts`는 DB와 무관한 순수 함수로, 파싱된 행과 "기존 상태 스냅샷"(기존 위치 코드, 기존 SKU→품목, 기존 바코드→SKU, 기존 stock 보유 조합)을 받아 행별 상태(신규/갱신/오류/수량 무시)와 사유를 반환.
- 검증 규칙은 spec R30에 더해 같은 (SKU, 위치코드)가 파일에 두 번 나오면 오류, 파일 안에서 같은 바코드를 다른 SKU가 쓰면 오류. 기존 위치 코드는 "기존"으로 표시하고 이름·상위를 바꾸지 않는다(spec이 품목만 갱신을 규정하므로 위치는 건너뜀).
- `POST /api/import/preview`(파일 업로드) 로그인 확인 → 파싱 → 스냅샷 조회 → 검증 → 행별 결과 JSON. 파일 크기 5MB, 5,000행 초과는 거절.
- `POST /api/import/apply`는 같은 파일을 다시 받아 재파싱·재검증하고, 오류가 있으면 거절, 없으면 `import_apply` 호출. 클라이언트가 보낸 검증 결과를 믿지 않는다.
- `GET /api/import/template` 양식 파일. `GET /api/export` 두 시트(R33). 이력 시트는 최대 50,000행(초과 시 최신 순으로 자르고 시트 마지막 줄에 안내)으로 제한해 함수 시간 초과를 막는다.
- `/import-export` 화면: 양식 받기, 파일 선택, 미리보기 표(상태 배지, 사유, 오류 행 우선 정렬), 오류가 있으면 확정 버튼 비활성, 확정 후 결과 건수, 내보내기 버튼.
- `validate.test.ts` 한 파일. 신규/갱신/수량 무시/오류(없는 위치, 음수, 바코드 충돌) 각 1건 이상을 다루는 최소 케이스.
**완료 기준** 빌드·린트·타입·`npx vitest run` 통과. Advisor가 Acceptance 8, 9, 10을 실제 파일로 확인.
**함정**
- 엑셀 셀의 수식·서식 값(`{formula, result}`, 날짜, rich text)은 문자열로 정규화해서 읽는다.
- 바코드·SKU가 숫자로 저장된 셀(선행 0 손실)은 문자열로 읽되, 양식의 해당 열은 텍스트 서식으로 만든다.
- 응답 본문 4.5MB 한도를 넘지 않게 내보내기 행 제한을 지킨다. 한도에 걸리면 보고서에 적는다.
- 수식 주입 방지로 내보내기 셀이 `=`, `+`, `-`, `@`로 시작하면 앞에 `'`를 붙이지 말고 문자열 셀 타입으로 쓴다(`exceljs`는 값을 문자열로 주면 수식으로 해석하지 않음, 이를 확인한다).

## W6. 대시보드 (R23)
**파일** `(app)/page.tsx`.
- 상단 검색창(제출하면 `/items?q=`로 이동), 최근 이력 10건(KST), 활성 품목 수와 활성 위치 수 카드. 부족 품목은 만들지 않는다(2차).
**완료 기준** 빌드·린트·타입 통과, 360px에서 가로 스크롤 없음.

## 검증 총괄 (Advisor)
- 각 Worker 완료 후 diff를 직접 읽고 `npm run build`, `npx tsc --noEmit`, `npm run lint`(W5는 vitest 포함)를 직접 실행.
- 전체 병합 후 `ego-browser`로 Acceptance 1~11을 순서대로 확인하고 360px 스크린샷을 남긴다.
- 커밋 전 `/code-review`, 푸시 전 `/security-review`. 1차 완료 후 `sdlc review`로 intent·spec 대조.
- 배포는 사용자가 요청할 때만 `vercel:deploy`. 이번 계획에는 포함하지 않는다.

## 커밋 단위
1. docs: intent·spec·plan 3종
2. chore: Next.js scaffold, 인증, 내비 (W1)
3. feat(db): 스키마, RLS, RPC (W2, S1 검증 후)
4. chore: DB 타입 생성
5. feat: 품목·위치 화면 (W3)
6. feat: 입출고·이동·조정·이력 (W4)
7. feat: 엑셀 가져오기·내보내기 (W5)
8. feat: 대시보드 (W6)
계획 이탈이 생기면 해당 커밋에서 plan.md도 함께 고친다.

## 위험
- 사용자 수동 단계(가입 차단, 첫 계정)가 빠지면 외부인이 가입할 수 있다. 앱 배포 전 반드시 확인한다.
- RLS 1차 정책은 로그인한 모든 사용자에게 품목·위치 쓰기를 허용한다. 계정이 한 명인 동안만 안전하다. 사용자 초대 기능(2차)은 RLS를 role로 분기한 뒤에만 연다.
- Supabase 무료 플랜의 비활성 일시정지, 저장소 한도.
- 5,000행 가져오기를 한 RPC 호출에 JSON으로 보내는 크기. 한도에 걸리면 행 수 제한을 낮춘다.
