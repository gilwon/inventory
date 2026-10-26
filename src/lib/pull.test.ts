// 당겨서 새로고침 저항 계산 테스트
import { describe, expect, it } from "vitest";
import { isPullReady, PULL_MAX, PULL_READY, pullDistance } from "./pull";

describe("pullDistance", () => {
  it("0 이하는 0이다", () => {
    expect(pullDistance(0)).toBe(0);
    expect(pullDistance(-50)).toBe(0);
  });

  it("거리가 늘수록 커지지만 증가폭은 줄어든다", () => {
    const a = pullDistance(50);
    const b = pullDistance(100);
    const c = pullDistance(150);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
    expect(c - b).toBeLessThan(b - a);
  });

  it("상한을 넘지 않는다", () => {
    expect(pullDistance(1000)).toBeLessThan(PULL_MAX);
    expect(pullDistance(1e6)).toBeLessThanOrEqual(PULL_MAX);
  });
});

describe("isPullReady", () => {
  it("기준선 70에서 준비 상태가 된다", () => {
    expect(isPullReady(PULL_READY - 0.1)).toBe(false);
    expect(isPullReady(PULL_READY)).toBe(true);
  });

  it("손가락을 약 123px 움직이면 기준선을 넘는다", () => {
    expect(isPullReady(pullDistance(122))).toBe(false);
    expect(isPullReady(pullDistance(123))).toBe(true);
  });
});
