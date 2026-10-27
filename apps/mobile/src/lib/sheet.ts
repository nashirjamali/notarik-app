/** Figma: the tallest sheet starts 180 from the top of an 844 high screen, so it is 664 high there. */
const FIGMA_TOP_GAP = 180;
const SMALLEST_MAX_HEIGHT = 480;
/** Room kept free above a sheet that fills the screen, under the status bar. */
const TOP_BREATHING_ROOM = 12;

/**
 * The tallest a bottom sheet may be: Figma's height on a tall screen, at least 480 on a short one,
 * and never more than the room between the status bar and the keyboard.
 */
export function sheetMaxHeight(windowHeight: number, topInset: number, keyboardHeight: number): number {
  const design = Math.max(windowHeight - FIGMA_TOP_GAP, SMALLEST_MAX_HEIGHT);
  const room = windowHeight - topInset - keyboardHeight - TOP_BREATHING_ROOM;
  return Math.min(design, room);
}

/** Whether a pull down of `distance` points, let go at `velocity`, should close the sheet. */
export function shouldCloseOnPull(distance: number, velocity: number): boolean {
  return distance > 100 || velocity > 0.8;
}

/** How far the screen is covered by the keyboard, from where the keyboard's top edge is. */
export function keyboardCover(windowHeight: number, keyboardTop: number): number {
  return Math.max(0, windowHeight - keyboardTop);
}
