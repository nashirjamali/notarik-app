import { formatIdr, itemsTotal, parseAmount, totalsDiffer } from "./money";

test("formats IDR with dot thousands separators", () => {
  expect(formatIdr(1_500_000)).toBe("Rp 1.500.000");
  expect(formatIdr(0)).toBe("Rp 0");
  expect(formatIdr(-1_500)).toBe("-Rp 1.500");
});

test("parses Indonesian amount shorthand", () => {
  expect(parseAmount("25rb")).toBe(25_000);
  expect(parseAmount("1,5jt")).toBe(1_500_000);
  expect(parseAmount("25.000")).toBe(25_000);
  expect(parseAmount("1.500.000")).toBe(1_500_000);
  expect(parseAmount("25.5")).toBeNull();
  expect(parseAmount("-5")).toBeNull();
});

test("warns when line items do not match the typed total", () => {
  const items = [{ lineTotalMinor: 5_000 }];
  expect(itemsTotal(items)).toBe(5_000);
  expect(totalsDiffer(10_000, items)).toBe(true);
  expect(totalsDiffer(10_000, [])).toBe(false);
});
