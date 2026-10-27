import { parseAmount } from "@/lib/money";
import { localToday } from "@/lib/receipt";
import type { Category } from "@/theme/tokens";

export type QuickParse = {
  total: number | null;
  merchant: string | null;
  description: string;
  category: Category;
  date: string;
};

// Same shape as the API's amount_in_text; the suffix may not be the start of a word ("35 kopi").
const AMOUNT = /(\d{1,3}(?:[.\s]\d{3})+|\d+(?:[.,]\d+)?)(?:\s*(juta|jt|ribu|rb|k)(?![a-z]))?/gi;
const MERCHANT = /\b(?:di|at|@)\s+([^\d\n]+?)(?=\s+(?:kemarin|yesterday|hari ini|today)\b|\s*\d|\s*$)/i;
const DATE_WORDS = /\b(kemarin|yesterday|hari ini|today)\b/gi;

const KEYWORDS: [Category, string[]][] = [
  ["Transport", ["gojek", "grab", "ojek", "taksi", "taxi", "bensin", "parkir", "tol", "bus", "kereta", "mrt", "krl", "transjakarta", "uber", "ojol"]],
  ["Bills", ["listrik", "pln", "pdam", "wifi", "internet", "pulsa", "token", "tagihan", "bpjs", "cicilan", "sewa", "kos", "kontrakan"]],
  ["Groceries", ["belanja", "indomaret", "alfamart", "supermarket", "sayur", "buah", "groceries", "pasar", "telur", "beras", "sembako"]],
  ["Shopping", ["baju", "sepatu", "tas", "shopee", "tokopedia", "lazada", "mall", "elektronik", "celana"]],
  ["Dining", ["nasi", "makan", "minum", "kopi", "coffee", "teh", "ayam", "bakso", "mie", "warteg", "warung", "resto", "restoran", "cafe", "lunch", "dinner", "breakfast", "sarapan", "jajan", "snack", "sate", "soto", "gofood", "grabfood"]],
];

function shiftDay(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function titleCase(value: string): string {
  return value.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

function pickAmount(text: string): { total: number; start: number; end: number } | null {
  const found: { total: number; start: number; end: number; suffixed: boolean }[] = [];
  for (const match of text.matchAll(AMOUNT)) {
    const total = parseAmount(`${match[1]}${match[2] ?? ""}`);
    if (total == null || total <= 0) continue;
    found.push({
      total,
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
      suffixed: Boolean(match[2]),
    });
  }
  if (found.length === 0) return null;
  // "2 nasi goreng 30rb": prefer the number with rb/k/jt, otherwise the biggest one.
  const best =
    found.find((item) => item.suffixed) ??
    found.reduce((largest, item) => (item.total > largest.total ? item : largest));
  return { total: best.total, start: best.start, end: best.end };
}

export function guessCategory(text: string): Category {
  const words = new Set(text.toLowerCase().match(/[a-z]+/g) ?? []);
  for (const [category, keywords] of KEYWORDS) {
    if (keywords.some((keyword) => words.has(keyword))) return category;
  }
  return "Other";
}

export function parseQuickAdd(input: string, today = localToday()): QuickParse {
  const text = input.replace(/\s+/g, " ").trim();
  const amount = pickAmount(text);
  const withoutAmount = amount ? `${text.slice(0, amount.start)} ${text.slice(amount.end)}` : text;

  const merchantMatch = MERCHANT.exec(withoutAmount);
  const merchantRaw = merchantMatch?.[1]?.trim() ?? "";
  const merchant = merchantRaw && merchantRaw.length <= 40 ? titleCase(merchantRaw) : null;

  const lowered = text.toLowerCase();
  const date = /\b(kemarin|yesterday)\b/.test(lowered) ? shiftDay(today, -1) : today;

  const description = withoutAmount
    .replace(merchantMatch?.[0] ?? "", " ")
    .replace(DATE_WORDS, " ")
    .replace(/\b(rp|idr)\b\.?/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    total: amount?.total ?? null,
    merchant,
    description: description ? description[0].toUpperCase() + description.slice(1) : "",
    category: guessCategory(text),
    date,
  };
}

/** The most expenses one Quick add can save at once. */
export const MAX_ROWS = 20;

const DATE_AT_START = /^(kemarin|yesterday|hari ini|today)\b/i;
const HAS_DATE_WORD = /\b(kemarin|yesterday|hari ini|today)\b/i;
// "di warteg", "at the cafe", "@ kantin": the words after an amount that still belong to it.
const MERCHANT_START = /^\s*(?:(?:di|at)\b|@)/i;
// An amount that cannot be a quantity: it has rb/k/jt, or dots like 25.000.
const SURE_AMOUNT = /^(?:\d{1,3}(?:\.\d{3})+|.*(?:juta|jt|ribu|rb|k))$/i;

/** Splits on new lines, ";", " + " and commas, but not on the comma inside a number like 1,5jt. */
function splitOnSeparators(text: string): string[] {
  const pieces: string[] = [];
  let current = "";
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const isNumberComma =
      char === "," && /\d/.test(text[index - 1] ?? "") && /\d/.test(text[index + 1] ?? "");
    if (char === "\n" || char === ";" || (char === "," && !isNumberComma)) {
      pieces.push(current);
      current = "";
    } else if (char === "+" && /\s/.test(text[index - 1] ?? "") && /\s/.test(text[index + 1] ?? "")) {
      pieces.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  pieces.push(current);
  return pieces;
}

/**
 * Cuts one piece after each sure amount that is followed by more words ("kopi 25rb nasi 30rb"),
 * unless those words start a place ("kopi 25rb di starbucks"). When unsure it keeps one piece.
 */
function cutAtAmounts(piece: string): string[] {
  const sure = [...piece.matchAll(AMOUNT)].filter((match) => {
    const token = `${match[1]}${match[2] ?? ""}`;
    return SURE_AMOUNT.test(token) && (parseAmount(token) ?? 0) > 0;
  });
  const cuts: number[] = [];
  for (const match of sure.slice(0, -1)) {
    const end = (match.index ?? 0) + match[0].length;
    if (!MERCHANT_START.test(piece.slice(end))) cuts.push(end);
  }
  const parts: string[] = [];
  let start = 0;
  for (const cut of cuts) {
    parts.push(piece.slice(start, cut));
    start = cut;
  }
  parts.push(piece.slice(start));
  return parts;
}

function isAmountOnly(piece: string): boolean {
  const amount = pickAmount(piece);
  if (!amount) return false;
  const rest = `${piece.slice(0, amount.start)} ${piece.slice(amount.end)}`;
  return !/[\p{L}]/u.test(rest.replace(/\b(rp|idr)\b/gi, ""));
}

/** "Indomaret, 187rb": a name with no amount followed by a piece that is only an amount. */
function mergeOrphans(pieces: string[]): string[] {
  const merged: string[] = [];
  for (let index = 0; index < pieces.length; index++) {
    const next = pieces[index + 1];
    if (next !== undefined && !pickAmount(pieces[index]) && isAmountOnly(next)) {
      merged.push(`${pieces[index]} ${next}`);
      index++;
    } else {
      merged.push(pieces[index]);
    }
  }
  return merged;
}

/** Every expense written in the text, as separate pieces (not capped). */
export function splitEntries(input: string): string[] {
  const separated = splitOnSeparators(input.replace(/\r\n?/g, "\n"))
    .map((piece) => piece.replace(/\s+/g, " ").trim())
    .filter((piece) => /[\p{L}\p{N}]/u.test(piece));
  return mergeOrphans(separated.flatMap(cutAtAmounts).map((piece) => piece.trim()).filter(Boolean));
}

/**
 * Reads several expenses from one text, at most MAX_ROWS. A date word at the very start
 * ("kemarin kopi 25rb, parkir 5rb") is shared by every row that has no date word of its own;
 * a place is never copied from one row to another. A row without an amount has `total: null`.
 */
export function parseMany(input: string, today = localToday()): QuickParse[] {
  const entries = splitEntries(input);
  if (entries.length === 0) return [];
  const leading = DATE_AT_START.exec(input.trim());
  const shared = leading ? parseQuickAdd(leading[0], today).date : null;
  return entries.slice(0, MAX_ROWS).map((entry) => {
    const row = parseQuickAdd(entry, today);
    return shared && !HAS_DATE_WORD.test(entry) ? { ...row, date: shared } : row;
  });
}
