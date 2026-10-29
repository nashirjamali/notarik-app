import { describe, expect, it } from "vitest";
import { guessCategory, MAX_ROWS, parseMany, parseQuickAdd, splitEntries } from "@/lib/quickAdd";

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

describe("splitEntries", () => {
  const cases: [string, string[]][] = [
    ["kopi 25rb, nasi goreng 30rb, parkir 5rb", ["kopi 25rb", "nasi goreng 30rb", "parkir 5rb"]],
    ["kopi 25rb; teh 5rb", ["kopi 25rb", "teh 5rb"]],
    ["kopi 25rb\nparkir 5rb", ["kopi 25rb", "parkir 5rb"]],
    ["kopi 25rb\r\nparkir 5rb", ["kopi 25rb", "parkir 5rb"]],
    ["kopi 25rb + parkir 5rb", ["kopi 25rb", "parkir 5rb"]],
    ["kopi 25rb,teh 5rb", ["kopi 25rb", "teh 5rb"]],
    ["bayar kos 1,5jt", ["bayar kos 1,5jt"]],
    ["bensin 25,000, kopi 18k", ["bensin 25,000", "kopi 18k"]],
    ["kopi 25rb nasi goreng 30rb", ["kopi 25rb", "nasi goreng 30rb"]],
    ["kopi 25rb nasi goreng 30rb parkir 5rb", ["kopi 25rb", "nasi goreng 30rb", "parkir 5rb"]],
    ["kopi 25.000 nasi 30.000", ["kopi 25.000", "nasi 30.000"]],
    ["2 nasi goreng 30rb teh 5rb", ["2 nasi goreng 30rb", "teh 5rb"]],
    ["makan siang 35rb di warteg", ["makan siang 35rb di warteg"]],
    ["kopi 25rb di starbucks nasi goreng 30rb", ["kopi 25rb di starbucks nasi goreng 30rb"]],
    ["Indomaret, 187rb", ["Indomaret 187rb"]],
    ["kopi 25rb,  ,teh 5rb", ["kopi 25rb", "teh 5rb"]],
    ["  ", []],
    ["", []],
    [",,;;", []],
    ["--- ,  ...", []],
    ["makan di warteg", ["makan di warteg"]],
  ];

  it.each(cases)("splits %j", (input, expected) => {
    expect(splitEntries(input)).toEqual(expected);
  });

  it("does not cap the pieces", () => {
    const text = Array.from({ length: 30 }, (_, index) => `item${index} ${index + 1}rb`).join(", ");
    expect(splitEntries(text)).toHaveLength(30);
  });
});

describe("parseMany", () => {
  it("parses each piece on its own", () => {
    const rows = parseMany("kopi 25rb, nasi goreng 30rb di warteg, parkir 5rb", TODAY);
    expect(rows).toEqual([
      { total: 25000, merchant: null, description: "Kopi", category: "Dining", date: TODAY },
      { total: 30000, merchant: "Warteg", description: "Nasi goreng", category: "Dining", date: TODAY },
      { total: 5000, merchant: null, description: "Parkir", category: "Transport", date: TODAY },
    ]);
  });

  it("gives one row for one expense, the same as parseQuickAdd", () => {
    const text = "makan siang 35rb di warteg";
    expect(parseMany(text, TODAY)).toEqual([parseQuickAdd(text, TODAY)]);
  });

  it("never copies a place from one row to another", () => {
    const rows = parseMany("nasi 20rb, teh 5rb di warteg", TODAY);
    expect(rows[0].merchant).toBeNull();
    expect(rows[1].merchant).toBe("Warteg");
  });

  it("shares a date word at the very start with rows that have none", () => {
    const rows = parseMany("kemarin kopi 25rb, parkir 5rb", TODAY);
    expect(rows.map((row) => row.date)).toEqual(["2026-10-26", "2026-10-26"]);
  });

  it("keeps a date word inside one row to that row", () => {
    const rows = parseMany("kopi 25rb, kemarin parkir 5rb", TODAY);
    expect(rows.map((row) => row.date)).toEqual([TODAY, "2026-10-26"]);
  });

  it("keeps a row without an amount, with a null total", () => {
    const rows = parseMany("kopi 25rb, makan di warteg", TODAY);
    expect(rows).toHaveLength(2);
    expect(rows[1].total).toBeNull();
    expect(rows[1].merchant).toBe("Warteg");
  });

  it("returns no rows for empty input", () => {
    expect(parseMany("", TODAY)).toEqual([]);
    expect(parseMany("  , ; ", TODAY)).toEqual([]);
  });

  it("caps the rows at MAX_ROWS", () => {
    const text = Array.from({ length: MAX_ROWS + 5 }, (_, index) => `item${index} ${index + 1}rb`).join(", ");
    expect(parseMany(text, TODAY)).toHaveLength(MAX_ROWS);
  });

  it("reads Indonesian and English lines together", () => {
    const rows = parseMany("lunch at the cafe 50k\ngrab 24rb\nbayar listrik 350.000", TODAY);
    expect(rows.map((row) => [row.total, row.category])).toEqual([
      [50000, "Dining"],
      [24000, "Transport"],
      [350000, "Bills"],
    ]);
  });
});

describe("numbers written as words", () => {
  it("reads a spoken amount like a typed one", () => {
    expect(parseQuickAdd("kopi dua puluh lima ribu", TODAY)).toMatchObject({
      total: 25000,
      description: "Kopi",
      category: "Dining",
    });
    expect(parseQuickAdd("makan siang tiga puluh lima ribu di warteg", TODAY)).toEqual(
      parseQuickAdd("makan siang 35rb di warteg", TODAY),
    );
    expect(parseQuickAdd("bayar kos satu setengah juta", TODAY).total).toBe(1_500_000);
    expect(parseQuickAdd("bensin seratus ribu", TODAY)).toMatchObject({ total: 100000, category: "Transport" });
  });

  it("keeps a quantity out of the amount", () => {
    const parsed = parseQuickAdd("dua kopi lima ribu", TODAY);
    expect(parsed.total).toBe(5000);
    expect(parsed.description).toBe("Dua kopi");
  });

  it("splits several spoken amounts into rows", () => {
    expect(splitEntries("kopi dua puluh lima ribu, parkir lima ribu")).toEqual(["kopi 25.000", "parkir 5.000"]);
    expect(splitEntries("kopi dua puluh lima ribu parkir lima ribu")).toEqual(["kopi 25.000", "parkir 5.000"]);
    const rows = parseMany("kopi dua puluh lima ribu, nasi goreng tiga puluh ribu di warteg, parkir lima ribu", TODAY);
    expect(rows.map((row) => row.total)).toEqual([25000, 30000, 5000]);
    expect(rows[1].merchant).toBe("Warteg");
  });

  it("mixes digits and words", () => {
    const rows = parseMany("kopi 25rb, parkir lima ribu", TODAY);
    expect(rows.map((row) => row.total)).toEqual([25000, 5000]);
  });

  it("leaves digit text exactly as before", () => {
    expect(parseQuickAdd("makan siang 35rb di warteg", TODAY).total).toBe(35000);
    expect(parseMany("kopi 25rb, parkir 5rb", TODAY)).toHaveLength(2);
  });
});
