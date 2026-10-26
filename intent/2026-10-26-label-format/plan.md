# Plan: 라벨 출력 형식 선택(바코드 또는 QR)
Source: spec.md (Status: draft). Status: draft.
공통 규약은 ../2026-10-26-inventory/plan.md의 "공통 함정"을 따른다. Worker는 커밋하지 않는다.

## 파일 맵
```
package.json, package-lock.json                  bwip-js 추가(npm install bwip-js)
src/lib/label-format.ts(+ .test.ts)             형식 타입과 바코드 가능 여부 검사 순수 함수
src/app/(app)/labels/actions.ts                  format 인자, 형식별 SVG, R4 검사, R6 검증
src/app/(app)/labels/label-picker.tsx            출력 형식 세그먼트, 형식 변경 시 미리보기 초기화
src/app/(app)/labels/label-sheet.tsx             형식별 클래스 부여(바코드는 세로 배치)
src/app/(app)/labels/labels.css                  바코드 칸 레이아웃 변형, 인쇄 흑백 고정
src/app/(app)/labels/page.tsx                    제목 문구 "라벨 인쇄" 유지, 주석의 QR 표기 갱신
intent/2026-10-26-inventory-phase2/spec.md       R27 문구 갱신
```

## 작업
1. 순수 함수 `canBarcode(code)`(ASCII 32~126, 1~24자)와 `unsupportedCodes(codes)`를 만들고 테스트한다(한글, 빈 문자열, 24자 경계, 25자).
2. `bwip-js`는 서버 액션 파일에서만 import한다. `toSVG({ bcid: "code128", text, scale: 2 또는 height 지정, includetext: false, paddingwidth: 0 })`의 출력 크기를 확인하고 SVG가 `width`/`height` 속성이 아니라 `viewBox`로 100% 크기에 맞게 늘어나는지 보정한다(필요하면 속성 제거). 흑백은 기본이 검정/투명이므로 라벨 흰 바탕 위에서 인쇄 색을 확인한다.
3. 선택기에 세그먼트(QR, 바코드)를 넣는다. 이식된 `Segmented`의 API(`src/components/lucian/segmented.tsx`, 입출고 화면 `move/move-form.tsx` 사용 예)를 따른다.
4. 바코드 칸 CSS. 칸 63.33mm x 34mm 안에서 바코드 폭 약 55mm, 높이 약 14mm, 아래에 이름(2줄)과 코드(글자). 화면 미리보기와 인쇄 모두.

## 완료 기준
build, tsc, lint, vitest 통과. R4 오류 문구가 서버 액션에서 나오는지 단위 수준으로 확인(액션은 로그인이 필요하므로 순수 함수 테스트와 코드 리뷰로 갈음). 브라우저 확인은 ego-browser 작업 공간이 종료돼 못 하면 "미확인"으로 보고한다.

## 위험
- Code128 SVG가 너무 촘촘하면 인쇄 후 스캔이 안 된다. 24자 상한과 폭 보정으로 막고 실기 인쇄는 미확인으로 남긴다.
- `bwip-js`가 서버 번들에 큰 용량을 더할 수 있다. 서버 액션에서만 쓴다.
