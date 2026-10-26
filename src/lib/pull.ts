// 당겨서 새로고침의 당김 거리 → 저항 → 준비 상태 계산(순수 함수)

// 이 값 이상이면 놓았을 때 새로고침한다.
export const PULL_READY = 70;
// 저항 곡선의 상한(무한히 당겨도 넘지 않는다).
export const PULL_MAX = 120;
// 저항 곡선이 휘는 정도. 클수록 오래 가볍게 따라온다.
export const PULL_SCALE = 140;

// 손가락이 움직인 거리 d(px)를 고무줄 저항을 준 화면상 당김 값으로 바꾼다.
export function pullDistance(d: number): number {
  return PULL_MAX * (1 - Math.exp(-Math.max(0, d) / PULL_SCALE));
}

export function isPullReady(pull: number): boolean {
  return pull >= PULL_READY;
}
