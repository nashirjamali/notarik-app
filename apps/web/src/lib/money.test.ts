import { expect, test } from "vitest";
import { formatIdr } from "./money";

test("formats IDR with dot thousands separators", () => {
  expect(formatIdr(1_500_000)).toBe("Rp 1.500.000");
  expect(formatIdr(25_000)).toBe("Rp 25.000");
  expect(formatIdr(999)).toBe("Rp 999");
});

test("formats zero, negative and very large amounts", () => {
  expect(formatIdr(0)).toBe("Rp 0");
  expect(formatIdr(-1_500)).toBe("-Rp 1.500");
  expect(formatIdr(1_234_567_890_123)).toBe("Rp 1.234.567.890.123");
});
