# Intent: 입출고 이력 달력
Author: 사용자(gilwon, 제품 소유자). Status: draft.

## Problem
이력 화면은 목록이라 어느 날에 입고·출고가 몰렸는지 한눈에 보기 어렵다.

## Proposed outcome
달력 화면(`/calendar`)에서 월 단위로 날짜별 입고·출고·이동·조정 건수를 보고, 날짜를 누르면 그날의 이력 목록으로 간다. 읽기 전용이다.
디자인 참고는 https://github.com/kargulstudio/calender-app-design 의 월 보기(month-view.tsx)다. 구조와 날짜 계산만 가져오고 스타일은 이 프로젝트의 토큰과 Tailwind 클래스로 다시 쓴다.

## Affected users and systems
작업자와 관리자 모두. 대상은 새 `/calendar` 화면, 메뉴(`nav.tsx`), 날짜 계산 유틸이다. DB 변경은 없다.

## Constraints
- 디자인 레포의 shadcn, Zustand, 일정 생성·드래그, 주·일 보기는 가져오지 않는다.
- 새 외부 라이브러리를 들이지 않는다. 새 시각 체계를 만들지 않는다(PRODUCT.md 브랜드 규칙).
- 데이터 화면이므로 모션을 넣지 않는다. 360px 폭에서 가로 스크롤이 없고 터치 대상은 44px 이상이다.
- 데모 모드(목 Supabase 클라이언트)에서도 동작한다.

## Open questions
- 한 달 이력이 5000건을 넘을 때의 집계 정확도. 이 문서에서는 넘으면 안내 문구를 보이는 쪽으로 정한다.
