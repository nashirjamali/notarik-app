import { expect, test } from "vitest";
import { parseAmount } from "./amount";

test("parses Indonesian shorthand", () => {
  expect(parseAmount("25rb")).toBe(25_000);
  expect(parseAmount("25k")).toBe(25_000);
  expect(parseAmount("1,5jt")).toBe(1_500_000);
  expect(parseAmount("2 juta")).toBe(2_000_000);
  expect(parseAmount("Rp 1.500.000")).toBe(1_500_000);
  expect(parseAmount("25.000")).toBe(25_000);
  expect(parseAmount("0")).toBe(0);
});

test("rejects anything that is not a clean amount", () => {
  for (const bad of ["", "abc", "-5", "25.5", "1.2.3", "rb", "12 34x"]) expect(parseAmount(bad)).toBeNull();
});
