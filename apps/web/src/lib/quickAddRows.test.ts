import { describe, expect, it } from "vitest";
import { applyEdit, oneExpense, rowIndexFromLoc, rowsFromText, rowTitle, toInput } from "@/lib/quickAddRows";

const TODAY = "2026-10-27";

/** Rows whose amounts are all known, which is what oneExpense needs. */
function known(text: string) {
  return rowsFromText(text, TODAY).map((row) => ({ ...row, total: row.total ?? 0 }));
}

describe("rowsFromText", () => {
  it("gives a row per expense with a key that follows its words", () => {
    const rows = rowsFromText("kopi 25rb, parkir 5rb", TODAY);
    expect(rows.map((row) => row.key)).toEqual(["kopi 25rb#0", "parkir 5rb#0"]);
    expect(rows.map((row) => row.total)).toEqual([25000, 5000]);
  });

  it("keeps a row's key when another piece is added after it", () => {
    const before = rowsFromText("kopi 25rb", TODAY);
    const after = rowsFromText("kopi 25rb, parkir 5rb", TODAY);
    expect(after[0].key).toBe(before[0].key);
  });

  it("tells apart the same piece typed twice", () => {
    const rows = rowsFromText("kopi 25rb, kopi 25rb", TODAY);
    expect(rows.map((row) => row.key)).toEqual(["kopi 25rb#0", "kopi 25rb#1"]);
  });

  it("is empty for empty text", () => {
    expect(rowsFromText("  ", TODAY)).toEqual([]);
  });
});

describe("applyEdit", () => {
  const [row] = rowsFromText("kopi 25rb", TODAY);

  it("changes only what was edited", () => {
    expect(applyEdit(row, undefined)).toBe(row);
    expect(applyEdit(row, { category: "Shopping" })).toMatchObject({ category: "Shopping", total: 25000 });
    expect(applyEdit(row, { total: 30000 })).toMatchObject({ category: "Dining", total: 30000 });
  });

  it("can clear an amount", () => {
    expect(applyEdit(row, { total: null }).total).toBeNull();
  });
});

describe("toInput", () => {
  it("builds the API body for one row", () => {
    const [row] = rowsFromText("makan siang 35rb di warteg", TODAY);
    expect(toInput({ ...row, total: 35000 })).toEqual({
      merchant: "Warteg",
      date: TODAY,
      total_minor: 35000,
      category: "Dining",
      note: "Makan siang",
      items: [],
    });
  });

  it("uses the words as the title when there is no place", () => {
    const [row] = rowsFromText("kopi 18k", TODAY);
    expect(rowTitle(row)).toBe("Kopi");
    expect(toInput({ ...row, total: 18000 })).toMatchObject({ merchant: "Kopi", note: undefined });
  });
});

describe("oneExpense", () => {
  it("adds the rows up and keeps them as items", () => {
    const rows = known("nasi 20rb, teh 5rb, kerupuk 2rb di warteg");
    const body = oneExpense(rows);
    expect(body.total_minor).toBe(27000);
    expect(body.merchant).toBe("Warteg");
    expect(body.category).toBe("Dining");
    expect(body.items).toEqual([
      { name: "Nasi", line_total_minor: 20000 },
      { name: "Teh", line_total_minor: 5000 },
      { name: "Kerupuk", line_total_minor: 2000 },
    ]);
  });

  it("names it Several items when there is no single place", () => {
    const rows = known("kopi 25rb di starbucks, parkir 5rb");
    expect(oneExpense(rows).merchant).toBe("Starbucks");
    const none = known("kopi 25rb, parkir 5rb");
    expect(oneExpense(none).merchant).toBe("Several items");
    const two = known("kopi 25rb di a, teh 5rb di b");
    expect(oneExpense(two).merchant).toBe("Several items");
  });

  it("takes the most common category, the first one on a tie", () => {
    const common = known("grab 20rb, kopi 25rb, teh 5rb");
    expect(oneExpense(common).category).toBe("Dining");
    const tie = known("grab 20rb, kopi 25rb");
    expect(oneExpense(tie).category).toBe("Transport");
  });
});

describe("rowIndexFromLoc", () => {
  it("reads the row from an API error path", () => {
    expect(rowIndexFromLoc("transactions.2.total_minor")).toBe(2);
    expect(rowIndexFromLoc("transactions.0")).toBe(0);
    expect(rowIndexFromLoc("transactions")).toBeNull();
    expect(rowIndexFromLoc("merchant")).toBeNull();
  });
});

describe("expensesFromRows", () => {
  const rows = rowsFromText("kopi 20rb di starbucks, roti 15rb di Starbucks, bensin 50rb di shell, parkir 5rb").map((row) => ({ ...row, total: row.total ?? 0 }));

  it("joins lines from the same place and day into one expense with items", async () => {
    const { expensesFromRows } = await import("@/lib/quickAddRows");
    const bodies = expensesFromRows(rows);
    expect(bodies).toHaveLength(3);
    expect(bodies[0]).toMatchObject({ merchant: "Starbucks", total_minor: 35000 });
    expect(bodies[0].items).toHaveLength(2);
    expect(bodies[1].merchant).toBe("Shell");
    expect(bodies[2].items).toEqual([]);
  });
});
