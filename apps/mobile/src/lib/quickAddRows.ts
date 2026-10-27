import { MAX_ROWS, parseMany, splitEntries, type QuickParse } from "@/lib/quickAdd";
import type { TransactionInput } from "@/lib/types";
import type { Category } from "@/theme/tokens";

/** One expense read from the Quick add text. `key` follows the words it was read from. */
export type Row = QuickParse & { key: string };
/** What the person changed on a row by hand. `total: null` clears an amount. */
export type RowEdit = { category?: Category; total?: number | null };

/**
 * The rows for a text. The key is the piece of text a row came from (plus a counter when the same
 * piece is typed twice), so edits stay with their row while the person keeps typing.
 */
export function rowsFromText(text: string, today?: string): Row[] {
  const entries = splitEntries(text).slice(0, MAX_ROWS);
  const seen = new Map<string, number>();
  return parseMany(text, today).map((row, index) => {
    const entry = entries[index];
    const count = seen.get(entry) ?? 0;
    seen.set(entry, count + 1);
    return { ...row, key: `${entry}#${count}` };
  });
}

export function applyEdit(row: Row, edit?: RowEdit): Row {
  if (!edit) return row;
  return {
    ...row,
    category: edit.category ?? row.category,
    total: "total" in edit ? (edit.total ?? null) : row.total,
  };
}

export function rowTitle(row: QuickParse): string {
  return row.merchant ?? (row.description || "Expense");
}

/** The API body for one row on its own. The row must have an amount. */
export function toInput(row: QuickParse & { total: number }): TransactionInput {
  return {
    merchant: rowTitle(row),
    date: row.date,
    total_minor: row.total,
    category: row.category,
    // Keep the words the person used when a merchant took the title.
    note: row.merchant && row.description ? row.description : undefined,
    items: [],
  };
}

const SEVERAL_ITEMS = "Several items";

/** Several rows saved as one expense: the rows become its items. Every row needs an amount. */
export function oneExpense(rows: (QuickParse & { total: number })[]): TransactionInput {
  const places = [...new Set(rows.map((row) => row.merchant).filter((name): name is string => Boolean(name)))];
  const counts = new Map<Category, number>();
  for (const row of rows) counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
  // The most common category; on a tie the one that came first.
  let category = rows[0].category;
  for (const [candidate, count] of counts) {
    if (count > (counts.get(category) ?? 0)) category = candidate;
  }
  return {
    merchant: places.length === 1 ? places[0] : SEVERAL_ITEMS,
    date: rows[0].date,
    total_minor: rows.reduce((sum, row) => sum + row.total, 0),
    category,
    items: rows.map((row) => ({
      name: row.description || row.merchant || "Item",
      line_total_minor: row.total,
    })),
  };
}

/** The row an API error is about: "transactions.2.total_minor" is row 2 (counting from 0). */
export function rowIndexFromLoc(loc: string): number | null {
  const match = /^transactions\.(\d+)(?:\.|$)/.exec(loc);
  return match ? Number(match[1]) : null;
}
