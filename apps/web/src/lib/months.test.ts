import { expect, test } from "vitest";
import { dayHeading, monthLabel, fullDate, shiftMonth, timeOf } from "./months";
import { groupByDay } from "./group";

test("shifts months across year boundaries", () => {
  expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  expect(shiftMonth("2026-10", 0)).toBe("2026-10");
});

test("labels months and days", () => {
  expect(monthLabel("2026-10")).toBe("October 2026");
  expect(dayHeading("2026-10-29", "2026-10-29")).toBe("Today");
  expect(dayHeading("2026-10-28", "2026-10-29")).toBe("Yesterday");
  expect(dayHeading("2026-10-20", "2026-10-29")).toBe("20 Oct");
  expect(dayHeading("2025-10-20", "2026-10-29")).toBe("20 Oct 2025");
});

test("groups consecutive rows by day and totals them in integers", () => {
  const rows = [
    { date: "2026-10-29", total_minor: 25_000 },
    { date: "2026-10-29", total_minor: 5_000 },
    { date: "2026-10-28", total_minor: 100 },
  ];
  expect(groupByDay(rows).map((g) => [g.date, g.total, g.items.length])).toEqual([
    ["2026-10-29", 30_000, 2],
    ["2026-10-28", 100, 1],
  ]);
});

test("reads the clock time from a timestamp, and nothing from a bad one", () => {
  expect(timeOf(new Date(2026, 9, 29, 8, 5).toISOString())).toBe("08:05");
  expect(timeOf("not a date")).toBe("");
});

test("writes the full date for the details screen", () => {
  const stamp = new Date(2026, 9, 29, 8, 15).toISOString();
  expect(fullDate("2026-10-29", stamp, "2026-10-29")).toBe("Today, 29 Oct 2026 · 08:15");
  expect(fullDate("2026-10-20", stamp, "2026-10-29")).toBe("20 Oct 2026 · 08:15");
});
