import { currentMonth, dayHeading, fullDate, monthLabel, shiftMonth, timeOf } from "@/lib/months";

describe("months", () => {
  it("shifts across year ends without timezone surprises", () => {
    expect(shiftMonth("2026-10", 1)).toBe("2026-11");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-03", -15)).toBe("2024-12");
  });

  it("uses the local calendar for the current month", () => {
    expect(currentMonth(new Date(2026, 9, 31, 23, 59))).toBe("2026-10");
    expect(currentMonth(new Date(2026, 0, 1, 0, 1))).toBe("2026-01");
  });

  it("spells months and day headings the way the design does", () => {
    expect(monthLabel("2026-10")).toBe("October 2026");
    expect(dayHeading("2026-10-27", "2026-10-27")).toBe("Today");
    expect(dayHeading("2026-10-26", "2026-10-27")).toBe("Yesterday");
    expect(dayHeading("2026-10-20", "2026-10-27")).toBe("20 Oct");
    expect(dayHeading("2025-12-20", "2026-10-27")).toBe("20 Dec 2025");
    expect(dayHeading("2026-11-01", "2026-12-01")).toBe("1 Nov");
  });

  it("formats the time and the full date", () => {
    const stamp = new Date(2026, 9, 22, 8, 15).toISOString();
    expect(timeOf(stamp)).toBe("08:15");
    expect(timeOf("nope")).toBe("");
    expect(fullDate("2026-10-22", stamp, "2026-10-22")).toBe("Today, 22 Oct 2026 · 08:15");
    expect(fullDate("2026-10-20", stamp, "2026-10-22")).toBe("20 Oct 2026 · 08:15");
  });
});
