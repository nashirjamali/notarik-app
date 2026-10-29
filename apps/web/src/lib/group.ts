/** Rows are already sorted by date; consecutive rows with the same date form one group. */
export function groupByDay<T extends { date: string; total_minor: number }>(
  rows: T[],
): { date: string; total: number; items: T[] }[] {
  const groups: { date: string; total: number; items: T[] }[] = [];
  for (const row of rows) {
    const current = groups[groups.length - 1];
    if (current && current.date === row.date) {
      current.items.push(row);
      current.total += row.total_minor;
    } else {
      groups.push({ date: row.date, total: row.total_minor, items: [row] });
    }
  }
  return groups;
}
