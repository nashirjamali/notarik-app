export function groupByDay<T extends { date: string }>(rows: T[]): { date: string; items: T[] }[] {
  const groups: { date: string; items: T[] }[] = [];
  for (const row of rows) {
    const current = groups[groups.length - 1];
    if (current && current.date === row.date) {
      current.items.push(row);
    } else {
      groups.push({ date: row.date, items: [row] });
    }
  }
  return groups;
}

export function groupWithTotals<T extends { date: string; total_minor: number }>(
  rows: T[],
): { date: string; total: number; items: T[] }[] {
  return groupByDay(rows).map((group) => ({
    ...group,
    total: group.items.reduce((sum, item) => sum + item.total_minor, 0),
  }));
}
