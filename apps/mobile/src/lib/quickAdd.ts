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
