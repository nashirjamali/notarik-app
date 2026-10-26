import type { ExpenseDraft } from "@/features/AddExpenseForm";
import type { ReceiptDraft, ReceiptIssue } from "@/lib/types";

/** Today's calendar date on the device, not in UTC (a late night must not become tomorrow). */
export function localToday(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function draftToForm(
  draft: ReceiptDraft | null,
  today = localToday(),
): ExpenseDraft {
  return {
    merchant: draft?.merchant ?? "",
    date: draft?.date ?? today,
    total: draft?.total_minor != null ? String(draft.total_minor) : "",
    category: draft?.category ?? "Other",
    // Items without an amount would fail form validation, so they are left out.
    items: (draft?.items ?? [])
      .filter((item) => item.line_total_minor != null)
      .map((item) => ({ name: item.name, amount: String(item.line_total_minor) })),
  };
}

export type ReviewItem = { name: string; qty: number | null; amount: string };

export function draftToReview(draft: ReceiptDraft | null, today?: string) {
  const form = draftToForm(draft, today);
  const items: ReviewItem[] = (draft?.items ?? [])
    .filter((item) => item.line_total_minor != null)
    .map((item) => ({
      name: item.name,
      qty: item.qty,
      amount: String(item.line_total_minor),
    }));
  return { merchant: form.merchant, date: form.date, total: form.total, category: form.category, items };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shiftDay(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function dateLabel(iso: string, today = localToday()): string {
  if (iso === today) return "Today";
  if (iso === shiftDay(today, -1)) return "Yesterday";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}

/** Item indexes the validator flagged, from issue fields like "items.2.line_total_minor". */
export function flaggedItems(issues: ReceiptIssue[] | null): Map<number, ReceiptIssue> {
  const flagged = new Map<number, ReceiptIssue>();
  for (const issue of issues ?? []) {
    const match = /^items\.(\d+)/.exec(issue.field);
    if (match && !flagged.has(Number(match[1]))) flagged.set(Number(match[1]), issue);
  }
  return flagged;
}

/** Issues that are not about one specific item (those get their own row hint). */
export function generalIssues(issues: ReceiptIssue[] | null): ReceiptIssue[] {
  return (issues ?? []).filter((issue) => !/^items\.\d+/.test(issue.field));
}
