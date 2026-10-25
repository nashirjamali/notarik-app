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
