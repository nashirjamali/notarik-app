// Every number that shapes the onboarding motion lives here so it can be tuned in one place.

export type IconName = "camera" | "coffee" | "receipt" | "groceries";

/** Order the icons pop out in on the entrance. */
export const ICON_ORDER: IconName[] = ["camera", "coffee", "receipt", "groceries"];

export const ENTRANCE = {
  circleMs: 450,
  circleFrom: 0.6,
  mascotDropFrom: -60,
  mascotLandMs: 380,
  squashX: 1.1,
  squashY: 0.85,
  squashMs: 110,
  settleMs: 220,
  iconStartMs: 380,
  iconStaggerMs: 90,
  copyStartMs: 600,
  buttonsStartMs: 800,
  fadeMs: 350,
  riseFrom: 12,
} as const;

export const IDLE = {
  mascotFloat: 4,
  mascotFloatMs: 3000,
  breatheTo: 1.02,
  iconBob: 5,
  iconSwayDeg: 3,
} as const;

/** Each icon bobs with its own period and starting point so they never move together. */
export const ICON_IDLE: Record<IconName, { periodMs: number; delayMs: number; phase: 1 | -1 }> = {
  camera: { periodMs: 2800, delayMs: 0, phase: 1 },
  coffee: { periodMs: 3400, delayMs: 400, phase: -1 },
  receipt: { periodMs: 2400, delayMs: 900, phase: 1 },
  groceries: { periodMs: 3600, delayMs: 200, phase: -1 },
};

/** Where each icon sits relative to the mascot centre; used to push it outward on a mascot tap. */
export const ICON_DIRECTION: Record<IconName, { x: -1 | 1; y: -1 | 1 }> = {
  camera: { x: -1, y: -1 },
  coffee: { x: 1, y: -1 },
  receipt: { x: 1, y: 1 },
  groceries: { x: -1, y: 1 },
};

export const BLINK = {
  minMs: 3000,
  maxMs: 6000,
  closeMs: 60,
  openMs: 90,
  closedScale: 0.1,
} as const;

export const TAP = {
  hopHeight: 18,
  hopUpMs: 160,
  hopDownMs: 200,
  landSquashY: 0.88,
  nudge: 14,
  iconPopScale: 1.15,
  iconPopMs: 110,
  wiggleDeg: 8,
} as const;

export const EYES = {
  /** How far a pupil can move from its resting point, in px of the 120 px wide mascot. */
  maxOffset: 3,
  /** The mascot leans at most this many degrees toward the touch. */
  maxLeanDeg: 6,
  /** Distance (px) at which the pupils reach their full offset. */
  reach: 140,
} as const;

/** Delay before icon number `index` starts popping out. */
export function staggerDelay(index: number): number {
  return ENTRANCE.iconStartMs + index * ENTRANCE.iconStaggerMs;
}

/** A blink delay in [minMs, maxMs); `random` is injectable so tests are deterministic. */
export function nextBlinkDelay(random: () => number = Math.random): number {
  const clamped = Math.min(Math.max(random(), 0), 0.999999);
  return Math.round(BLINK.minMs + clamped * (BLINK.maxMs - BLINK.minMs));
}

/**
 * Pupil offset for a touch at (dx, dy) from the mascot centre. The offset grows with the distance
 * and is capped on a circle of radius `maxOffset`, so the pupil never leaves the eye.
 */
export function eyeOffset(dx: number, dy: number): { x: number; y: number } {
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return { x: 0, y: 0 };
  const strength = Math.min(distance / EYES.reach, 1) * EYES.maxOffset;
  return { x: (dx / distance) * strength, y: (dy / distance) * strength };
}

/** Lean angle in degrees: toward the touch on the x axis, capped. */
export function leanDegrees(dx: number): number {
  const value = (dx / EYES.reach) * EYES.maxLeanDeg;
  return Math.max(-EYES.maxLeanDeg, Math.min(EYES.maxLeanDeg, value));
}
