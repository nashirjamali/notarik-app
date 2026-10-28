import { keyboardCover, sheetMaxHeight, shouldCloseOnPull } from "@/lib/sheet";

describe("sheetMaxHeight", () => {
  it("is Figma's 664 on a tall screen with no keyboard", () => {
    expect(sheetMaxHeight(844, 47, 0)).toBe(664);
  });

  it("never goes under 480 by design, even on a short screen", () => {
    expect(sheetMaxHeight(600, 20, 0)).toBe(480);
  });

  it("shrinks to the room left under the status bar when the keyboard is up", () => {
    // 844 - 47 (status bar) - 336 (keyboard) - 12 = 449
    expect(sheetMaxHeight(844, 47, 336)).toBe(449);
  });

  it("is limited by the room on a short screen too", () => {
    expect(sheetMaxHeight(568, 20, 0)).toBe(480);
    expect(sheetMaxHeight(568, 20, 300)).toBe(236);
  });
});

describe("shouldCloseOnPull", () => {
  it("closes on a long pull or a fast flick, and springs back otherwise", () => {
    expect(shouldCloseOnPull(101, 0)).toBe(true);
    expect(shouldCloseOnPull(30, 0.9)).toBe(true);
    expect(shouldCloseOnPull(100, 0.8)).toBe(false);
    expect(shouldCloseOnPull(10, 0.1)).toBe(false);
  });
});

describe("keyboardCover", () => {
  it("is how much of the screen the keyboard takes, never negative", () => {
    expect(keyboardCover(844, 508)).toBe(336);
    expect(keyboardCover(844, 844)).toBe(0);
    expect(keyboardCover(844, 900)).toBe(0);
  });
});
