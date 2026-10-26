# Intent: 라벨 출력 형식 선택(바코드 또는 QR)
Author: 사용자(gilwon, 제품 소유자). Status: draft.

## Problem
라벨은 QR로만 출력된다. 바코드 스캐너나 바코드 라벨 용지를 쓰는 현장에서는 QR이 아니라 1차원 바코드 라벨이 필요하다.

## Proposed outcome
`/labels`에서 출력 형식을 바코드와 QR 중에서 고를 수 있고, 고른 형식으로 미리보기와 인쇄가 된다. 기본은 지금과 같은 QR이다.

## Affected users and systems
라벨을 인쇄하는 관리자와 작업자. 대상은 `/labels` 화면과 라벨 생성 Server Action, 인쇄 스타일이다.

## Constraints
- 라벨 내용(품목은 SKU, 위치는 위치 코드)과 A4 3열 격자, 인쇄 시 메뉴 숨김은 그대로다.
- 앱의 스캔 화면에서 인쇄한 바코드를 읽을 수 있어야 한다.
- 새 외부 UI 라이브러리는 들이지 않는다(코드 생성 라이브러리 1개는 가능).

## Open questions
- 바코드 규격(Code128 외 EAN 등)과 SKU에 한글이 있을 때의 처리.
