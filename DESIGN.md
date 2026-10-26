---
name: 재고 관리
description: 현장 작업자가 한 손으로 읽고 누르는, 조용하고 또렷한 재고 계기판
colors:
  page: "#F4F2EE"
  surface: "#FFFFFF"
  surface-2: "#F5F3EF"
  surface-3: "#EAE7E1"
  ink: "#16151B"
  ink-2: "#57535F"
  ink-3: "#8E8A97"
  accent: "#6A57F2"
  accent-2: "#2F8FE0"
  accent-ink: "#FFFFFF"
  mint: "#119C72"
  warn: "#D6731E"
  danger: "#C72D49"
typography:
  title:
    fontFamily: "system-ui, -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif"
    fontSize: "20px"
    fontWeight: 700
  body:
    fontFamily: "system-ui, -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif"
    fontSize: "16px"
    fontWeight: 400
  label:
    fontFamily: "system-ui, -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif"
    fontSize: "14px"
    fontWeight: 500
rounded:
  sm: "6px"
  md: "12px"
  lg: "16px"
spacing:
  sm: "8px"
  md: "12px"
  lg: "16px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "44px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: "44px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
  badge:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
---

# Design System: 재고 관리

## Overview

**Creative North Star: "현장 계기판"**

창고에서 서서 한 손으로 쓰는 계기판처럼 읽히는 화면이다. 숫자와 상태가 먼저 보이고 장식은 뒤로 물러난다. 한 화면에 강조색은 하나이고, 나머지는 따뜻한 종이색 바탕 위의 중립색으로 둔다. 눌러야 할 것은 크고 분명하며, 틀리기 쉬운 값(수량)은 다른 요소보다 눈에 띄어야 한다.

이 시각 체계는 Lucian UX/UI 라이브러리의 `--ux-*` 토큰과 이식 요소를 그대로 쓴다. 새 시각 체계를 따로 만들지 않고, 고유성은 문구와 작업 흐름, 정확한 상태 표시에서 나온다. 데이터 화면에는 모션을 넣지 않고 `prefers-reduced-motion`을 존중한다.

**Key Characteristics:**
- 중립 바탕 위에 보라 강조색 하나. 상태는 의미 색(mint, warn, danger)으로만 말한다.
- 터치 대상 44px 이상, 둥근 모서리(12~16px), 진한 입력 테두리.
- 라이트와 다크는 같은 토큰 이름의 값만 바뀐다. `dark:` 색 변형은 쓰지 않는다.
- 평평한 면과 얇은 테두리. 그림자와 모션은 떠 있거나 상태가 바뀌는 요소에만 쓴다.

## Colors

따뜻한 종이색 바탕에 흰 면을 올리고, 짙은 먹색 글자와 보라 강조색 하나로 구성한 절제된 팔레트다. 다크는 거의 검은 남색 바탕에 연보라 강조색이다.

### Primary
- **계기판 보라** (#6A57F2): 주 버튼, 선택된 탭, 링크, 포커스 링, 날짜 범위 띠. 한 화면에서 가장 중요한 동작 하나에만 채운 면으로 쓴다. 다크에서는 연보라(#B7A4FF)로 바뀌고 그 위 글자는 어두운 색(#0B0C12)이 된다.

### Secondary
- **하늘빛 보조** (#2F8FE0): 그라데이션과 보조 강조에만 쓴다. 단독으로 글자나 버튼에 쓰지 않는다.

### Neutral
- **종이 바탕** (#F4F2EE): 페이지 배경.
- **흰 면** (#FFFFFF): 카드, 입력칸, 모달 같은 올려진 면.
- **연한 면** (#F5F3EF): 배지, 보조 배경, 세그먼트 바탕.
- **진한 면** (#EAE7E1): 비활성 면과 눌린 상태.
- **먹색** (#16151B): 본문과 제목.
- **보조 글자** (#57535F): 설명, 캡션. 흰 면 위에서 AA를 넘는다.
- **약한 글자** (#8E8A97): 입력 테두리와 아이콘 전용이다. 글자에는 쓰지 않는다(대비 3.4:1).

### Status
- **성공 초록** (#119C72): 테두리와 아이콘에만 쓴다. 글자색으로는 대비가 모자란다.
- **경고 주황** (#D6731E): 테두리와 아이콘에만 쓴다.
- **오류 빨강** (#C72D49): 오류 문구와 위험 표시. 라이브러리 기본보다 어둡게 조정해 흰 바탕에서 4.5:1을 맞췄다.

### Named Rules
**The One Voice Rule.** 한 화면의 채운 강조색 면은 하나다. 주 동작이 둘이면 하나는 보조 버튼으로 내린다.

**The Color Is Never Alone Rule.** 상태는 색만으로 전하지 않는다. 아이콘이나 글자를 함께 쓴다. 초록과 주황은 글자색으로 쓰지 않는다.

## Typography

**Body Font:** 시스템 한글 스택(`system-ui`, `Apple SD Gothic Neo`, `Noto Sans KR`, `Malgun Gothic`)

**Character:** 설치 없이 기기마다 가장 자연스러운 한글로 그린다. 굵기와 크기 차이로만 위계를 만들고 글꼴을 섞지 않는다.

### Hierarchy
- **Title** (700, 20px): 화면 제목.
- **Body** (400, 16px): 입력칸 안의 글자와 본문. 모바일 입력 확대를 막으려고 입력은 16px 아래로 내리지 않는다.
- **Label** (500, 14px): 입력 라벨, 버튼 글자, 표 머리글.
- **Caption** (400, 12px): 보조 설명과 배지. 색은 보조 글자.

### Named Rules
**The Sixteen-Pixel Input Rule.** 입력칸 글자는 16px 이상이다. 14px 이하로 내리면 iOS가 화면을 확대한다.

## Layout

모바일 우선 한 열이 기본이다. 360px에서 가로 스크롤이 없어야 하고, 본문은 하단 탭 바 높이만큼 아래 여백(`pb-32`)을 둔다. md(768px) 이상에서는 왼쪽 레일 내비게이션과 본문 영역으로 나뉘고 폼은 `max-w-xl` 한 열이다. 여백 리듬은 8, 12, 16px이며 카드 안쪽은 16px, 필드 사이는 12~16px이다.

## Elevation & Depth

평평하다. 면은 얇은 테두리(`--ux-line`)와 색 단계(종이 바탕, 흰 면, 연한 면)로 구분하고 그림자는 거의 쓰지 않는다. 카드의 그림자는 1px 선 하나(`0 1px 0 var(--ux-line)`)뿐이다. 진짜로 떠 있는 요소(토스트, 하단 탭 바, 달력 팝업)만 `--ux-shadow` 계열 그림자를 받는다.

### Named Rules
**The Flat-By-Default Rule.** 면은 가만히 있을 때 평평하다. 그림자와 움직임은 요소가 화면 위로 떠 있거나 상태가 바뀔 때만 나타난다.

## Shapes

둥글고 큼직한 형태다. 입력칸과 버튼은 12px, 카드와 업로드 영역은 16px 이상, 배지는 6px이다. 입력과 보조 버튼의 테두리는 진한 `ink-3` 1px로 흰 면 위에서도 경계가 3:1 이상 보이게 한다. 장식용 모서리 변형은 쓰지 않는다.

## Components

### Buttons
- **Shape:** 12px 모서리, 높이 44px 이상, 글자 줄바꿈 없음(`whitespace-nowrap`).
- **Primary:** 보라 면(#6A57F2)에 흰 글자, 안쪽 8px 16px. 한 화면에 하나.
- **Secondary:** 흰 면에 진한 테두리, 먹색 글자.
- **Hover / Focus:** hover는 불투명도 90%, 비활성은 60%. 포커스는 2px 보라 링과 2px 오프셋이 반드시 보인다.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** 흰 면, 얇은 `--ux-line` 테두리.
- **Shadow Strategy:** 1px 하단 선 하나. 위의 Elevation 참고.
- **Internal Padding:** 16px.

### Inputs / Fields
- **Style:** 흰 면, 진한 테두리 1px, 12px 모서리, 높이 44px 이상, 글자 16px.
- **Focus:** 2px 보라 링.
- **Error / Disabled:** 오류는 오류 빨강 문구를 칸 아래에 둔다. 비활성은 불투명도를 낮춘다.

### Navigation
- 데스크톱은 왼쪽 레일(#040), 모바일은 하단 탭 바(#041)이며 앞 4개 항목과 더보기로 나눈다. 현재 위치를 `aria-current`와 강조로 표시하고 방향키 이동을 지원한다.

### Segmented Tabs (signature)
- 입고·출고·이동·조정을 가르는 라디오 그룹(#047)이다. 칸 높이 44px, 선택된 칸이 올라온 면으로 보이고 방향키로 이동한다.

### Toast, Inline Alert, Empty State
- 토스트(#070)는 오류 8초, 그 외 4.5초 뒤 닫히고 모바일에서는 탭 바 위에 뜬다. 인라인 알림(#072)은 오류·성공을 색과 아이콘으로 함께 전한다. 빈 상태(#092)와 스켈레톤(#079)은 움직이지 않는다.

### Date Range, File Drop
- 기간 선택(#030)은 폼 안에서 접고 펼치며, 업로드(#032)는 점선 영역을 눌러 고르거나 끌어다 놓는다. 둘 다 원본의 모션 값을 쓰되 reduced-motion에서 즉시 끝난다.

## Do's and Don'ts

### Do:
- **Do** 모든 색은 `--ux-*` 토큰이나 `bg-surface`, `text-ink`, `border-line`, `bg-accent` 같은 Tailwind 연결 이름으로 쓴다.
- **Do** 새 화면도 360px에서 가로 스크롤 없이 확인하고, 터치 대상은 44px 이상으로 둔다.
- **Do** 상태를 색과 함께 아이콘이나 글자로 전한다.
- **Do** 이식한 Lucian 요소의 원본 첫 줄 라이선스 주석을 지킨다.
- **Do** 모든 모션은 `prefers-reduced-motion`에서 즉시 끝나게 한다.

### Don't:
- **Don't** `dark:` 색 변형이나 `zinc-`, `blue-`, `red-`, `green-`, `amber-` 같은 고정 색 클래스를 쓰지 않는다.
- **Don't** 초록(`mint`)이나 주황(`warn`)을 글자색으로 쓰지 않는다. 대비가 모자란다.
- **Don't** 새 시각 체계나 외부 UI 라이브러리를 들이지 않는다.
- **Don't** 데이터 화면(목록, 표, 폼)에 장식 모션을 넣지 않는다.
- **Don't** 입력칸 글자를 16px 아래로 내리지 않는다.
- **Don't** `line`·`ink-2` 같은 알파 토큰에 `/50` 같은 불투명도 문법을 쓰지 않는다. 동작하지 않는다.
