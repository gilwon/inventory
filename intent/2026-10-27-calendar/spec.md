# Spec: 입출고 이력 달력
Source: intent.md. Status: draft.

## 동작
- 경로 `/calendar?m=YYYY-MM`. `m`이 없거나 실제 달이 아니면 이번 달(KST)로 본다.
- 월 이동은 이전 달·다음 달·오늘 링크(서버 렌더, 링크 이동)로 한다.
- 6주(42칸) 격자, 일요일 시작. 이번 달 밖의 날짜는 흐리게 표시하되 건수는 세지 않는다(그 달 조회 범위 밖).
- 오늘(KST) 칸은 강조한다.
- 날짜 칸은 건수가 있는 종류만 `입고 3` 같은 칩으로 보인다. 종류는 입고(receive), 출고(issue), 이동(transfer_out만 센다, 한 묶음은 1건), 조정(adjust, 정정 포함), 가져오기(import).
  좁은 화면(md 미만)은 칩에서 글자를 줄이고 색 점과 숫자만 보인다. 스크린리더용 aria-label은 항상 전체 문구.
- 날짜 칸 전체가 `/history?from=YYYY-MM-DD&to=YYYY-MM-DD` 링크다.
- 날짜 구분은 KST 기준이다.

## 데이터
- `movements`에서 `type,reverses_id,created_at`만 읽는다. 기간은 월 1일 00:00 KST ~ 말일 23:59:59.999 KST.
- 한 요청 1000행씩 `range`로 이어 읽고 최대 5000행에서 멈춘다. 멈췄으면 "이 달 이력이 많아 일부만 집계했습니다." 안내를 보인다.
- 오류 문구는 DB 오류를 노출하지 않고 "달력을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."로 고정한다.

## 순수 함수 (`src/lib/calendar.ts`)
- `parseMonth(s)`: `YYYY-MM`이 실제 달이면 `{year, month}`, 아니면 null.
- `monthKey(year, month)`, `shiftMonth(year, month, delta)`.
- `monthGrid(year, month)`: 일요일 시작 42개 `YYYY-MM-DD`.
- `kstDay(iso)`: UTC ISO를 KST 날짜 `YYYY-MM-DD`로. 잘못된 값이면 빈 문자열.
- `monthRangeIso(year, month)`: `{from, to}` ISO 문자열(KST 경계).
- `tallyByDay(rows)`: `Map<day, {receive, issue, transfer, adjust, import}>`.

## 완료 기준
메뉴에 "달력"이 있고 `/calendar`가 열린다. 순수 함수 테스트가 통과한다. 데모 쿠키로도 열린다. tsc, lint, test, build가 통과한다.

## 추가 사양: 입출고 내역 패널
디자인 레포의 "Time off stats" 패널 자리에 "입출고 내역" 패널을 둔다.
- 달력 오른쪽 304px 고정 폭(xl 이상). xl 미만은 달력 아래로 내려가고 위쪽 헤어라인으로 구분한다. 패널 배경은 달력 페이지 배경(bg-surface-2 계열), 달력 쪽과 헤어라인으로 나눈다.
- 제목 "입출고 내역", 보조줄 "2026년 10월". 그 달 이력을 최신순(created_at desc, id desc) 최대 20건.
- 줄 하나는 날짜 시각(KST "10월 27일 14:30"), 종류 칩(달력 칩과 같은 색), 품목 "SKU 이름", 수량(입고 +, 출고 -, 이동은 부호 없이). 이동은 transfer_out만 1건으로 센다. 조정은 부호를 따른다.
- 줄을 누르면 해당 날짜 `/history?from=D&to=D`로 간다.
- 맨 아래 "이 달 이력 전체 보기" 링크는 `/history?from=월1일&to=월말일`.
- 이력이 없으면 EmptyState("이 달 이력이 없습니다").
- 달력 조회와 별도의 작은 쿼리(limit 20)로 읽는다. 오류는 패널 안에서만 InlineAlert로 보이고 달력은 영향받지 않는다.
