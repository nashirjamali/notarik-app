import { guessCategory, parseQuickAdd } from "@/lib/quickAdd";

const TODAY = "2026-10-27";

describe("parseQuickAdd", () => {
  it("reads the example from the design", () => {
    expect(parseQuickAdd("makan siang 35rb di warteg", TODAY)).toEqual({
      total: 35000,
      merchant: "Warteg",
      description: "Makan siang",
      category: "Dining",
      date: TODAY,
    });
  });

  it("handles thousands separators, k and jt", () => {
    expect(parseQuickAdd("bensin 25.000", TODAY).total).toBe(25000);
    expect(parseQuickAdd("kopi 18k", TODAY).total).toBe(18000);
    expect(parseQuickAdd("bayar kos 1,5jt", TODAY).total).toBe(1_500_000);
  });

  it("does not treat the k of a word as thousands", () => {
    expect(parseQuickAdd("beli 2 kopi 36000", TODAY).total).toBe(36000);
    expect(parseQuickAdd("35 kopi", TODAY).total).toBe(35);
  });

  it("prefers the suffixed number over a plain quantity", () => {
    expect(parseQuickAdd("2 nasi goreng 30rb di warung", TODAY).total).toBe(30000);
  });

  it("finds a merchant after di/at and stops before the amount", () => {
    expect(parseQuickAdd("di indomaret kemang 187rb", TODAY).merchant).toBe("Indomaret Kemang");
    expect(parseQuickAdd("lunch at the cafe 50k", TODAY).merchant).toBe("The Cafe");
    expect(parseQuickAdd("kopi 18k", TODAY).merchant).toBeNull();
  });

  it("moves the date to yesterday for kemarin", () => {
    const parsed = parseQuickAdd("kemarin grab 24rb", TODAY);
    expect(parsed.date).toBe("2026-10-26");
    expect(parsed.category).toBe("Transport");
    expect(parsed.description).toBe("Grab");
  });

  it("returns no total when there is no amount", () => {
    const parsed = parseQuickAdd("makan siang di warteg", TODAY);
    expect(parsed.total).toBeNull();
    expect(parseQuickAdd("   ", TODAY)).toMatchObject({ total: null, merchant: null, description: "" });
  });
});

describe("guessCategory", () => {
  it("matches whole words only and falls back to Other", () => {
    expect(guessCategory("bayar listrik")).toBe("Bills");
    expect(guessCategory("belanja bulanan")).toBe("Groceries");
    expect(guessCategory("ke bank")).toBe("Other");
    expect(guessCategory("tasting")).toBe("Other");
  });
});
