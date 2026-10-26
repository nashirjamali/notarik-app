import { dateLabel, draftToForm, localToday, draftToReview, flaggedItems, generalIssues } from "@/lib/receipt";
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

describe("draftToReview", () => {
  it("keeps the quantity of each item that has an amount", () => {
    expect(draftToReview(base).items).toEqual([{ name: "Nasi", qty: 1, amount: "20000" }]);
  });
});

describe("dateLabel", () => {
  it("says Today and Yesterday, otherwise a short date", () => {
    expect(dateLabel("2026-10-27", "2026-10-27")).toBe("Today");
    expect(dateLabel("2026-10-26", "2026-10-27")).toBe("Yesterday");
    expect(dateLabel("2026-03-05", "2026-10-27")).toBe("5 Mar 2026");
    expect(dateLabel("2026-11-01", "2026-12-01")).toBe("1 Nov 2026");
    expect(dateLabel("2026-03-01", "2026-03-02")).toBe("Yesterday");
    expect(dateLabel("nope", "2026-10-27")).toBe("nope");
  });
});

describe("issue helpers", () => {
  const issues = [
    { code: "ITEM_PRICE_IS_UNIT_PRICE", field: "items.2.line_total_minor", detail: "unit price" },
    { code: "ITEMS_SUM_MISMATCH", field: "items", detail: "sum" },
    { code: "DATE_IN_FUTURE", field: "date", detail: "future" },
  ];
  it("splits item-level issues from general ones", () => {
    expect([...flaggedItems(issues).keys()]).toEqual([2]);
    expect(generalIssues(issues).map((issue) => issue.code)).toEqual(["ITEMS_SUM_MISMATCH", "DATE_IN_FUTURE"]);
    expect(flaggedItems(null).size).toBe(0);
  });
});

describe("localToday", () => {
  it("uses the local calendar date", () => {
    expect(localToday(new Date(2026, 9, 27, 0, 30))).toBe("2026-10-27");
    expect(localToday(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});
