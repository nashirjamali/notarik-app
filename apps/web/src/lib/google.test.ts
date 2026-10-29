import { describe, expect, it } from "vitest";
import { nonceFromBytes } from "./google";

describe("nonceFromBytes", () => {
  it("writes each byte as two hex digits", () => {
    expect(nonceFromBytes(new Uint8Array([0, 15, 16, 255]))).toBe("000f10ff");
  });
});
