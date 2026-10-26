# Checklist: 재고 관리 웹앱 1차
작업 단위가 끝날 때마다 바로 체크한다. 상세는 plan.md.

## 문서
- [x] intent.md 승인
- [x] spec.md 승인 (C1, D7 포함)
- [x] plan.md, checklist.md, context-notes.md 작성
- [x] plan.md 사용자 승인

## S0 Advisor 선행
- [x] git init, 문서 3종 첫 커밋
- [x] Supabase 새 프로젝트 비용 확인과 사용자 승인 (Free 플랜, 서울)
- [x] Supabase 프로젝트 생성 (inventory, ref ikbzdqkjdvaatqmrmqzz)
- [x] 사용자 수동 작업 (가입 차단 disable_signup=true 확인, 첫 계정 생성)
- [x] .env.local 값 확보

## W1 scaffold·인증·내비
- [x] 구현
- [x] Advisor 검증 (build, tsc, lint, 미로그인 이동 보고 확인, 360px는 코드 구조만)
- [x] 커밋 (e15cded)

## W2 DB 마이그레이션
- [x] 구현 (0001, 0002, 0003)
- [x] S1 적용과 advisors 확인 (WARN 8건은 의도된 RPC 노출)
- [x] S1 타입 생성
- [x] S1 SQL 시나리오 검증 (Acceptance 2, 3, 4, 5, 6, 7, R20, 권한, 가져오기)
- [x] 커밋 (b9a1d0a)

## 코드 리뷰 (W3~W5)
- [x] /code-review 표준 축, 스펙 축
- [x] 하드 위반 수정 (지시자 순서 6곳, 다크 대비, 오류 노출, 날짜 검증, 작업자 표시 0004)

## 코드 리뷰 (W1, W2)
- [x] /code-review 표준 축, 스펙 축
- [x] 하드 위반 3건 수정 (지시자 순서 2곳, 다크 대비, 포커스 링)

## W3 품목·위치
- [x] 구현
- [x] Advisor 검증 (코드 읽기, 빌드). 화면 확인은 계정 생성 후
- [x] 커밋 (b2ff52a)

## W4 입출고·이동·조정·이력
- [x] 구현
- [x] Advisor 검증 (코드 읽기, 빌드). 화면 확인은 계정 생성 후
- [x] 커밋 (8867511)

## W5 엑셀
- [x] 구현
- [x] vitest 통과 (8건)
- [x] Advisor 검증 (코드 읽기). 실제 파일 확인은 계정 생성 후
- [x] 커밋 (bcff4bb)

## W6 대시보드
- [x] 구현
- [x] Advisor 검증 (코드 읽기, 빌드)
- [x] 커밋

## 마무리
- [x] Acceptance 브라우저 확인 (미로그인 이동, 입고·출고·이동·정정·조정, 초과 출고 거절, 품목·위치 보관 거절, 중복 SKU·바코드 거절, 엑셀 가져오기(오류 거절·수량 무시)·내보내기, 360px 8개 화면 가로 넘침 없음). 다크 모드는 미확인
- [x] /code-review (W1~W5 두 차례)
- [x] /security-review (푸시 전 에이전트 검토, Critical·High 없음, Medium 2건 처리)
- [x] sdlc review (의도 대조, 경미한 수정 필요 판정 후 반영)
- [x] 계획 이탈 반영 확인 (plan.md)
- [ ] 후속(2차 전) 보안 Low: items·locations 길이 CHECK, move·history Server Action의 getUser 일관성
- [ ] 후속 UI: 낮은 터치 대상, 가져오기 미리보기 갱신 건수, Date.now 경고, 다크 모드·사진 업로드 확인
