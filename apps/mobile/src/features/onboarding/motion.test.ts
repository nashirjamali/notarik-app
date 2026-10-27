import {
  BLINK,
  ENTRANCE,
  EYES,
  eyeOffset,
  ICON_ORDER,
  leanDegrees,
  nextBlinkDelay,
  staggerDelay,
} from "./motion";

describe("staggerDelay", () => {
  it("starts at the icon start time and steps by the stagger", () => {
    expect(staggerDelay(0)).toBe(ENTRANCE.iconStartMs);
    expect(staggerDelay(1) - staggerDelay(0)).toBe(ENTRANCE.iconStaggerMs);
    expect(staggerDelay(ICON_ORDER.length - 1)).toBe(
      ENTRANCE.iconStartMs + (ICON_ORDER.length - 1) * ENTRANCE.iconStaggerMs,
    );
  });

  it("finishes the icons before the buttons appear", () => {
    expect(staggerDelay(ICON_ORDER.length - 1)).toBeLessThanOrEqual(ENTRANCE.buttonsStartMs);
  });
});

describe("nextBlinkDelay", () => {
  it("stays inside the blink window", () => {
    expect(nextBlinkDelay(() => 0)).toBe(BLINK.minMs);
    expect(nextBlinkDelay(() => 0.5)).toBe((BLINK.minMs + BLINK.maxMs) / 2);
    expect(nextBlinkDelay(() => 1)).toBeLessThanOrEqual(BLINK.maxMs);
    expect(nextBlinkDelay(() => 5)).toBeLessThanOrEqual(BLINK.maxMs);
    expect(nextBlinkDelay(() => -1)).toBe(BLINK.minMs);
  });

  it("is random with the default generator but always in range", () => {
    for (let i = 0; i < 50; i++) {
      const value = nextBlinkDelay();
      expect(value).toBeGreaterThanOrEqual(BLINK.minMs);
      expect(value).toBeLessThanOrEqual(BLINK.maxMs);
    }
  });
});

describe("eyeOffset", () => {
  it("rests in the centre when the touch is on the mascot", () => {
    expect(eyeOffset(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it("points toward the touch", () => {
    const right = eyeOffset(50, 0);
    expect(right.x).toBeGreaterThan(0);
    expect(right.y).toBeCloseTo(0);
    const up = eyeOffset(0, -50);
    expect(up.y).toBeLessThan(0);
  });

  it("never leaves the eye, however far the touch is", () => {
    for (const [dx, dy] of [
      [1000, 0],
      [-1000, 1000],
      [0, -5000],
      [300, 400],
    ]) {
      const { x, y } = eyeOffset(dx, dy);
      expect(Math.hypot(x, y)).toBeLessThanOrEqual(EYES.maxOffset + 1e-9);
    }
  });

  it("grows with distance up to the cap", () => {
    expect(Math.hypot(...Object.values(eyeOffset(20, 0)) as [number, number])).toBeLessThan(
      Math.hypot(...Object.values(eyeOffset(100, 0)) as [number, number]),
    );
    expect(eyeOffset(EYES.reach, 0).x).toBeCloseTo(EYES.maxOffset);
  });
});

describe("leanDegrees", () => {
  it("leans toward the touch and is capped", () => {
    expect(leanDegrees(0)).toBe(0);
    expect(leanDegrees(70)).toBeGreaterThan(0);
    expect(leanDegrees(-70)).toBeLessThan(0);
    expect(leanDegrees(10_000)).toBe(EYES.maxLeanDeg);
    expect(leanDegrees(-10_000)).toBe(-EYES.maxLeanDeg);
  });
});
