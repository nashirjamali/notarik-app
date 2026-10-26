import type { ExpenseDraft } from "@/features/AddExpenseForm";
import type { ReceiptDraft } from "@/lib/types";

export function draftToForm(
  draft: ReceiptDraft | null,
  today = new Date().toISOString().slice(0, 10),
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
