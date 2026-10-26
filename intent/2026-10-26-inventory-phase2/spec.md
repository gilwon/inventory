# Spec: 재고 관리 웹앱 2차
Source: intent.md (Status: approved). Status: approved. 1차 spec은 ../2026-10-26-inventory/spec.md. 번호 R4, R22, R24~R27은 1차 spec의 번호를 이어서 쓴다.

## Requirements
권한
- R4a 관리자만 `/settings/users`에서 팀원 계정(이메일, 표시 이름, 임시 비밀번호, 권한)을 만든다. 만들기는 Edge Function이 하고 호출자의 관리자 권한을 서버에서 확인한다.
- R4b 관리자는 사용자 목록(표시 이름, 이메일, 권한)을 보고 다른 사용자의 권한을 바꾼다. 마지막 관리자는 작업자로 바꿀 수 없다.
- R4c 모든 사용자는 `/settings/password`에서 자기 비밀번호를 바꾼다.
- R4d 작업자는 DB가 막는다. `items`·`locations`의 insert·update, 사진 업로드, `import_apply`는 관리자만 된다. 화면은 작업자에게 해당 버튼과 메뉴를 숨기고, 직접 주소로 들어오면 안내 문구를 보인다.
- R4e 입고·출고·이동·조정·정정, 조회, 내보내기, 스캔, 라벨, 실사는 작업자도 한다.

실사·부족
- R22 `/stocktake`에서 위치를 고르면 그 위치에 수량이 있는 품목을 모두 나열한다. 실제 수량을 입력한 행 중 현재 수량과 다른 행만 조정하고, 사유는 그런 행마다 필수이다. 한 트랜잭션이며 한 행이라도 실패하면 아무것도 반영되지 않고 실패한 품목을 알려 준다. 이력은 행마다 조정 한 건이다.
- R24 대시보드에 부족 품목 목록(활성 품목, 최소 수량 0 초과, 합계 < 최소 수량)이 부족한 양이 큰 순으로 보이고 품목 상세로 이동한다. 없으면 "부족한 품목이 없습니다".

스캔·라벨
- R25 `/scan`에서 카메라로 QR·바코드를 읽는다. 값은 품목 SKU, 없으면 품목 바코드, 없으면 위치 코드 순서로 찾아(대소문자 무시) 해당 상세로 이동한다. 찾지 못하면 안내 문구를 보이고 다시 스캔한다. 카메라 권한이 거절되거나 카메라가 없으면 안내와 직접 입력 칸을 보인다.
- R26 `/move`의 품목 칸과 위치 칸(이동은 도착 위치 포함)에 스캔 버튼이 있고, 스캔하면 해당 칸이 채워진다. 값이 해석되지 않으면 칸을 바꾸지 않고 안내한다.
- R27 `/labels`에서 품목 또는 위치를 여러 개 골라 라벨 인쇄 화면을 연다. 라벨은 QR 또는 Code128 바코드(출력 형식 선택, 기본 QR, 품목은 SKU, 위치는 위치 코드), 코드 글자, 이름을 담고 A4 한 장에 격자로 배치한다. 인쇄는 브라우저 인쇄이고 메뉴·버튼은 인쇄에 나오지 않는다.

## Design
- DB. 0006은 1차 후속의 길이 CHECK. 이 2차는 0007부터 한다.
  - `profiles.email` 열을 더하고 `handle_new_user`가 채운다(기존 행은 `auth.users`로 채움). 사용자 목록에 이메일을 보이려는 것이다.
  - `public.is_admin()`(security definer, stable, `search_path=''`)을 만들고 RLS와 RPC가 쓴다.
  - RLS. `items`·`locations` insert·update 정책에 `is_admin()`을 더한다. 사진 insert 정책도 관리자만. `profiles`는 모두 읽고, 쓰기는 RPC로만(`set_user_role`).
  - RPC. `import_apply`는 처음에 `is_admin()` 확인(아니면 한국어 오류). `set_user_role(uid, role)`은 관리자만, 마지막 관리자를 작업자로 바꾸면 거절. `record_stocktake(location_id, rows jsonb)`는 행마다 `record_adjust`와 같은 규칙으로 처리하고 한 트랜잭션. `low_stock_items()`은 security invoker로 부족 품목과 합계를 돌려준다.
- 계정 생성. Edge Function `create-user`는 요청의 Authorization JWT로 호출자를 확인하고 `profiles.role='admin'`인지 서비스 클라이언트로 확인한 뒤 `auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name } })`를 호출한다. 트리거가 프로필을 만들고, 함수가 필요하면 권한을 갱신한다. 서비스 롤 키는 함수 환경에서만 읽는다. 앱은 `supabase.functions.invoke`로 호출한다.
- 앱. `src/lib/auth.ts`의 `getRole()`로 서버 컴포넌트와 Server Action이 권한을 읽는다. 클라이언트에는 필요한 불리언만 넘긴다.
- 스캔. 브라우저 카메라와 JS 디코더 라이브러리(iOS Safari 호환을 위해 BarcodeDetector 단독에 의존하지 않는다). 값 해석은 Server Action `resolveScan(text)`이 DB에서 한다. 스캔 컴포넌트는 `/scan`과 `/move`가 같이 쓴다.
- 라벨. QR은 클라이언트에서 생성한다. 인쇄 화면은 `@media print` 스타일로 격자 배치한다.
- 화면 추가. `/stocktake`, `/scan`, `/labels`, `/settings/users`, `/settings/password`. 내비게이션은 "더보기" 안에 둔다.

## Decisions
- D9 계정 생성은 Edge Function으로 한다(사용자 선택). 기각한 안은 대시보드 수동 생성과 앱 서버에 서비스 롤 키 저장. 이유는 앱에서 초대하되 키를 앱 밖에 두려는 것이다.
- D10 이메일 초대는 하지 않는다. 관리자가 임시 비밀번호를 정해 전한다. 이유는 메일 발송 설정과 재설정 화면이 필요 없고 알림 없음 제약과 맞는다.
- D11 권한 차이는 사용자가 확정했다(R4d, R4e). 작업자의 조정·정정은 허용한다.
- D12 실사는 한 트랜잭션이다. 기각한 안은 행별 부분 성공. 이유는 실사 결과가 절반만 반영되면 어느 행이 반영됐는지 추적이 어렵기 때문이다.
- D13 계정 비활성화·삭제는 2차에 넣지 않는다(intent 열린 질문).
- D14 라벨 크기 선택 기능은 넣지 않는다. A4 격자 한 가지(3열)로 한다.

## Conflicts
- 1차 spec C-없음. 1차 plan의 "서비스 롤 키는 쓰지 않는다"는 앱 코드에 해당하고, Edge Function은 Supabase 안에서 쓰므로 원칙을 유지한다. 이 해석이 맞는지 사용자가 확인했다(D9 선택).
- 1차 RLS 주석("계정 한 명 가정")은 이 2차에서 role 분기로 대체된다. 그 전에 계정을 추가하지 않는다.

## Acceptance
1. 관리자가 `/settings/users`에서 작업자 계정을 만들면 목록에 보이고, 그 계정으로 로그인해 `/settings/password`에서 비밀번호를 바꿀 수 있다.
2. 작업자로 로그인하면 품목·위치 편집 버튼, 가져오기, 사용자 관리 메뉴가 보이지 않는다. 같은 요청을 직접 보내도(PostgREST, RPC) DB가 거절한다. 입고·출고·이동·조정은 된다.
3. 마지막 관리자를 작업자로 바꾸려 하면 거절된다.
4. 비로그인 사용자와 작업자는 `create-user`를 호출해도 거절된다.
5. `/stocktake`에서 위치를 고르고 두 행의 실제 수량을 바꿔 사유와 함께 제출하면 이력에 조정 두 건이 생기고 수량이 맞는다. 한 행의 사유를 비우면 제출이 거절되고 아무것도 바뀌지 않는다.
6. 최소 수량 5인 품목의 합계를 4로 만들면 대시보드 부족 목록에 보이고, 5로 올리면 사라진다.
7. `/scan`에서 SKU, 바코드, 위치 코드 QR을 읽으면 각 상세가 열린다. 없는 값은 안내가 나온다. (카메라 실기 확인은 HTTPS 필요)
8. `/move`의 품목·위치 칸 스캔 버튼이 칸을 채운다.
9. `/labels`에서 품목 3개와 위치 2개를 골라 인쇄 화면을 열면 QR이 있는 라벨 5개가 A4 격자로 보이고 메뉴는 인쇄 미리보기에 나오지 않는다.
10. 360px에서 새 화면 모두 가로 스크롤이 없다.
