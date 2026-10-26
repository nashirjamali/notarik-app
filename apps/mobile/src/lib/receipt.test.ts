import { draftToForm } from "@/lib/receipt";
import type { ReceiptDraft } from "@/lib/types";

const base: ReceiptDraft = {
  merchant: "Warung",
  date: "2026-10-17",
  total_minor: 25000,
  subtotal_minor: null,
  category: "Dining",
  items: [
    { name: "Nasi", qty: 1, line_total_minor: 20000 },
    { name: "Unreadable", qty: null, line_total_minor: null },
  ],
  source: "photo",
  field_confidence: {},
};

describe("draftToForm", () => {
  it("maps a draft to form strings and drops items without an amount", () => {
    expect(draftToForm(base)).toEqual({
      merchant: "Warung",
      date: "2026-10-17",
      total: "25000",
      category: "Dining",
      items: [{ name: "Nasi", amount: "20000" }],
    });
  });

  it("falls back to empty fields, today and Other when the model found nothing", () => {
    expect(draftToForm(null, "2026-10-27")).toEqual({
      merchant: "",
      date: "2026-10-27",
      total: "",
      category: "Other",
      items: [],
    });
  });
});
