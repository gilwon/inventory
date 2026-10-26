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
- [ ] 사용자 수동 작업 안내 (가입 차단, 첫 계정 생성)
- [ ] .env.local 값 확보

## W1 scaffold·인증·내비
- [ ] 구현
- [ ] Advisor 검증 (build, tsc, lint, 미로그인 이동, 360px)
- [ ] 커밋

## W2 DB 마이그레이션
- [ ] 구현 (0001, 0002, 0003)
- [ ] S1 적용과 advisors 확인
- [ ] S1 타입 생성
- [ ] S1 SQL 시나리오 검증 (Acceptance 2, 3, 4, 5, 6, 7, R20)
- [ ] 커밋

## W3 품목·위치
- [ ] 구현
- [ ] Advisor 검증 (Acceptance 5, 6)
- [ ] 커밋

## W4 입출고·이동·조정·이력
- [ ] 구현
- [ ] Advisor 검증 (Acceptance 2, 3, 4, 7, 11)
- [ ] 커밋

## W5 엑셀
- [ ] 구현
- [ ] vitest 통과
- [ ] Advisor 검증 (Acceptance 8, 9, 10)
- [ ] 커밋

## W6 대시보드
- [ ] 구현
- [ ] Advisor 검증
- [ ] 커밋

## 마무리
- [ ] Acceptance 1~11 전체 브라우저 확인
- [ ] /code-review
- [ ] /security-review
- [ ] sdlc review (의도 대조)
- [ ] 계획 이탈 반영 확인 (plan.md)
