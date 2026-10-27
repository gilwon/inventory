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
