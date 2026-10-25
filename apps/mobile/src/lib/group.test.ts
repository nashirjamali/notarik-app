import { groupByDay } from "./group";

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
