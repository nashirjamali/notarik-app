import { groupByDay, groupWithTotals } from "./group";

test("groups consecutive rows by date and keeps first-seen order", () => {
  const rows = [
    { date: "2026-10-17", id: "b" },
    { date: "2026-10-17", id: "a" },
    { date: "2026-10-16", id: "c" },
  ];
  expect(groupByDay(rows)).toEqual([
    {
      date: "2026-10-17",
      items: [
        { date: "2026-10-17", id: "b" },
        { date: "2026-10-17", id: "a" },
      ],
    },
    { date: "2026-10-16", items: [{ date: "2026-10-16", id: "c" }] },
  ]);
});

test("groups by day with each day's total", () => {
  const rows = [
    { date: "2026-10-22", total_minor: 187300 },
    { date: "2026-10-22", total_minor: 25000 },
    { date: "2026-10-21", total_minor: 18000 },
  ];
  expect(groupWithTotals(rows).map((group) => [group.date, group.total, group.items.length])).toEqual([
    ["2026-10-22", 212300, 2],
    ["2026-10-21", 18000, 1],
  ]);
});
