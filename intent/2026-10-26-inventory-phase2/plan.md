# Plan: 재고 관리 웹앱 2차
Source: spec.md (Status: approved). Status: approved.
공통 규약은 ../2026-10-26-inventory/plan.md의 "공통 규약"을 따른다. 모든 Worker 브리프에 붙인다.

## 공통 함정
- Next 16.4.3. `AGENTS.md`와 `node_modules/next/dist/docs/`를 읽는다. `params`·`searchParams`는 Promise. 쿠키·Supabase를 쓰는 컴포넌트는 `<Suspense>` 안에 둔다.
- Supabase 클라이언트는 `<Database>` 제네릭이 붙었다(1차 후속). 캐스트로 덮지 않는다.
- 서비스 롤 키는 앱 코드, `.env*`, Vercel 환경변수 어디에도 두지 않는다. Edge Function 안에서만 읽는다.
- 오류 문구는 한국어. DB 오류 원문은 화면에 보이지 않는다(`koRpcError`, `koError` 사용).
- Worker는 커밋하지 않고 마이그레이션을 DB에 적용하지 않는다(Advisor가 적용).

## 파일 맵
```
supabase/migrations/0007_roles_rls.sql        profiles.email, is_admin(), RLS 분기, import_apply 관리자 확인, set_user_role
supabase/migrations/0008_stocktake_lowstock.sql  record_stocktake, low_stock_items
supabase/functions/create-user/index.ts        관리자 확인 후 계정 생성
src/lib/auth.ts                                getRole(), requireAdmin()
src/app/(app)/settings/users/{page.tsx,user-form.tsx,role-select.tsx,actions.ts}
src/app/(app)/settings/password/{page.tsx,actions.ts}
src/app/(app)/stocktake/{page.tsx,stocktake-form.tsx,actions.ts}
src/app/(app)/scan/{page.tsx,actions.ts}       resolveScan
src/app/(app)/scan/scanner.tsx                 카메라 스캔 컴포넌트(/scan, /move 공용)
src/app/(app)/labels/{page.tsx,label-picker.tsx,label-sheet.tsx}
src/app/(app)/page.tsx                         부족 품목 목록 추가
src/app/(app)/move/move-form.tsx               스캔 버튼
src/app/(app)/{items,locations,import-export}/*  작업자에게 편집 UI 숨김
src/app/(app)/nav.tsx                          더보기에 새 메뉴(Advisor가 마지막에)
```

## 작업 순서와 병렬
S2 Advisor, W7 DB·함수(직렬) → 마이그레이션 적용·함수 배포·SQL 검증 → W8, W9, W10 병렬(파일이 겹치지 않는다) → 통합 검증 → nav 추가 → 브라우저 확인.

## W7. DB·권한·Edge Function (R4a, R4b, R4d, R22, R24)
- 0007, 0008, `create-user` 함수 소스, `src/lib/auth.ts`.
- `profiles.email`을 추가하고 `handle_new_user`가 채우며 기존 행은 `auth.users`로 채운다. `is_admin()`은 `profiles.role='admin'`을 본다.
- 정책. `items_insert/update`, `locations_insert/update`, 사진 insert를 `is_admin()`으로 바꾼다(기존 정책을 drop하고 다시 만든다). `import_apply`는 본문 처음에 `is_admin()` 확인. `set_user_role`은 관리자만, 마지막 관리자 강등 거절.
- `record_stocktake(p_location_id uuid, p_rows jsonb)`. 행은 `{item_id, actual_qty, reason}`. 내부에서 `record_adjust`와 같은 규칙(사유 필수, 음수 거절, 같은 수량은 건너뜀)을 쓰고 실패 시 품목 SKU를 넣은 한국어 오류. 반환은 반영한 행 수.
- `low_stock_items()`은 security invoker. 열은 item_id, sku, name, unit, total_qty, min_qty, shortage. 부족한 양 큰 순.
- grant는 `authenticated`에만, `anon`과 `public`은 회수. 새 함수 모두 `search_path=''`.
- `create-user` 함수. `Deno.serve`, CORS, 입력 검증(이메일 형식, 비밀번호 8자 이상 72자 이하, 표시 이름 1~50자, 권한 admin|worker), 호출자 JWT 확인(`auth.getUser`), 서비스 클라이언트로 `profiles.role` 확인, `createUser`, 프로필 `display_name`·`role` 갱신. 오류는 한국어 JSON `{ error }`와 알맞은 상태 코드. 서비스 롤 키는 `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")`로만 읽고 응답·로그에 넣지 않는다.
- `auth.ts`의 `getRole()`은 `'admin'|'worker'|null`. `requireAdmin()`은 관리자가 아니면 한국어 오류.
- 완료 기준. 파일 생성, `build`·`tsc`·`lint` 통과(함수 소스는 Deno라 tsconfig에서 제외되는지 확인), 보고에 SQL 시나리오 제안.
- Advisor 검증. 마이그레이션 적용, 함수 배포, 롤백 DO 블록으로 권한 시나리오(작업자 역할로 insert 거절, 마지막 관리자 강등 거절, 실사 한 행 실패 시 전체 롤백, 부족 목록).

## W8. 사용자·권한 화면 (R4a~R4e) — W7 이후
- `/settings/users`(관리자만, 목록 + 계정 만들기 폼 + 권한 변경), `/settings/password`.
- 작업자에게 숨길 것. 품목·위치 새로 만들기·수정·보관·사진, 가져오기 패널(내보내기는 허용). 작업자가 `/items/new`나 `/import-export`의 가져오기, `/settings/users`를 직접 열면 안내 문구. 서버 컴포넌트에서 `getRole()`로 분기하고 DB가 최종 방어선이다.
- 계정 만들기는 `supabase.functions.invoke('create-user')`를 서버 액션에서 호출한다. 성공하면 임시 비밀번호를 화면에 한 번만 보여 주지 않고(재표시 없음) "관리자가 직접 전달하세요" 안내만 한다.
- 완료 기준. build·tsc·lint 통과. 360px 가로 넘침 없음.

## W9. 실사·부족 품목 (R22, R24) — W7 이후
- `/stocktake`(위치 선택 → 품목 행 목록, 실제 수량 입력, 다른 값이면 사유 입력 칸이 필수로 열림, 한 번에 제출). `record_stocktake` 호출. 성공 시 반영 건수 안내.
- 대시보드 `(app)/page.tsx`에 `low_stock_items()` 목록 섹션 추가(품목, 합계/최소, 부족량, 상세 링크). 기존 요약 카드와 최근 이력은 그대로.
- 완료 기준. build·tsc·lint 통과. 360px 가로 넘침 없음.

## W10. 스캔·라벨 (R25~R27) — W7과 독립, 병렬 가능
- 의존성 추가. 카메라 디코더(`@zxing/browser` 또는 동급, iOS Safari 호환)와 QR 생성(`qrcode`). 추가한 패키지와 이유를 보고한다.
- `scanner.tsx`는 카메라 시작·정지(언마운트 시 반드시 정지), 권한 거절·카메라 없음 처리, 직접 입력 대체 칸, 한 번 읽으면 `onResult(text)` 호출. `resolveScan(text)`는 SKU → 바코드 → 위치 코드 순서로 대소문자 무시 조회해 `{kind:'item'|'location'|'none', id}`를 돌려준다.
- `/scan`은 결과에 따라 상세로 이동하고, 없으면 안내 후 재스캔. `move-form.tsx`에는 품목 칸·위치 칸(이동은 도착 위치 포함)에 스캔 버튼.
- `/labels`는 품목·위치를 검색해 체크로 고르고 "라벨 만들기"로 격자(3열, A4)를 보인 뒤 "인쇄" 버튼은 `window.print()`. `@media print`로 메뉴·버튼 숨김.
- 완료 기준. build·tsc·lint 통과. 카메라는 실기 확인 불가라고 명시. 360px 가로 넘침 없음.

## 검증 총괄 (Advisor)
- 각 Worker diff 직접 읽기, build·tsc·lint·vitest.
- SQL 시나리오(롤백), Edge Function 호출(관리자 JWT, 작업자 JWT, 비로그인)을 curl로.
- 작업자 계정으로 브라우저 확인. 로그인은 사용자가 직접 한다.
- `/code-review`는 커밋 전, `/security-review`는 푸시 전. 마지막에 `sdlc review`.

## 커밋 단위
1. 1차 후속(제네릭·터치 대상·CHECK 등) 2. 0007~0008과 함수와 `auth.ts` 3. 사용자·권한 화면 4. 실사·부족 5. 스캔·라벨 6. nav와 문서.

## 계획 이탈 (코드와 같은 커밋에서 반영)
- W8. 공통 컴포넌트 `admin-only-notice.tsx`를 추가했다. 가져오기 양식 다운로드(`api/import/template`)도 관리자 전용이 됐다. 사진 업로드는 클라이언트가 Storage에 직접 올리므로 폼을 작업자에게 렌더하지 않고 Storage RLS(`is_admin()`)가 막는다.
- W9. 실사 대상은 해당 위치에 수량 0 초과인 활성 품목이다. 같은 수량 행은 보내지 않는다(DB가 사유 없는 같은 수량 행을 거절하므로). 부족 품목은 `low-stock-card.tsx`로 분리해 대시보드에 연결했다. 실사 성공 시 `/`도 revalidate한다.
- W10. 위치 QR은 접두사 없이 위치 코드만 담는다(spec R27). 품목 SKU와 같으면 품목이 이긴다. QR SVG는 spec의 "클라이언트 생성" 대신 서버 Action `buildLabels`(`qrcode`)로 만들고 한 번에 120개까지다. 카메라는 `@zxing/browser`만 쓴다(BarcodeDetector 분기 없음). 새 의존성 `@zxing/browser` 0.2.1, `@zxing/library` 0.23.0, `qrcode` 1.5.4, `@types/qrcode` 1.5.6.
- 내비. 새 항목(실사, 스캔, 라벨, 사용자 관리, 비밀번호 변경)을 `NAV_ITEMS`에 추가했다. 사용자 관리는 작업자에게도 메뉴가 보이고 들어가면 안내가 나온다.
- 입출고 화면의 품목·위치(이동은 출발·도착) 칸마다 스캔 버튼을 둔다. 읽은 코드는 `resolveScan`으로 해석하고, 칸 종류와 맞지 않거나 등록되지 않은 코드면 칸을 바꾸지 않고 토스트로 안내한다. 품목 칸은 해석된 품목이면 읽은 코드를 검색어로 채워 목록에서 고르게 한다. `/scan`은 자동 이동 대신 결과 카드와 상세 링크를 보인다.
- 인쇄 시 하단 탭 바 숨김 선택자를 `[class*="u04"]`로 고쳤다(sdlc review 지적).

## 위험
- 작업자 계정을 만들기 전에 RLS를 분기하면 첫 계정이 막히지 않는지 확인한다(첫 계정은 관리자).
- Edge Function 배포는 Supabase 쪽 변경이다. 함수 코드가 틀리면 계정 생성만 실패하고 다른 기능은 영향이 없다.
- 카메라 스캔은 HTTPS 배포 전에는 휴대폰에서 확인할 수 없다.
- 계정 비활성화가 없다. 퇴사자는 Supabase 대시보드에서 막는다.
