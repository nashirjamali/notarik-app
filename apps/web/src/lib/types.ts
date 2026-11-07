import type { components } from "./schema";

type Schemas = components["schemas"];

export type Transaction = Schemas["TransactionRead"];
export type TransactionPage = Schemas["TransactionPage"];
export type Category = Transaction["category"];
export type PaymentMethod = NonNullable<Transaction["payment_method"]>;
/** Typed-in expenses never carry a discount; the API defaults it to 0, so it is optional here. */
export type TransactionInput = Omit<Schemas["TransactionCreate"], "source" | "discount_minor"> & { discount_minor?: number };
export type TransactionPatch = Schemas["TransactionUpdate"];

export const paymentMethods: PaymentMethod[] = ["Cash", "QRIS", "Debit card", "Credit card", "E-wallet", "Bank transfer", "Other"];

/** The order the mobile app lists categories in (filters, sheets). */
export const categoryOrder: Category[] = ["Dining", "Groceries", "Transport", "Bills", "Shopping", "Other"];

export const categories: Category[] = ["Groceries", "Dining", "Transport", "Shopping", "Bills", "Other"];

export type Me = { user_id: string; name: string | null; email: string | null };

/** What the API read from a receipt. Every field can be missing: the user fills the gaps before confirming. */
export type ReceiptRun = {
  id: string;
  status: string;
  content_type?: string | null;
  draft: {
    merchant?: string | null;
    date?: string | null;
    total_minor?: number | null;
    discount_minor?: number | null;
    category?: Category;
    items?: { name: string; qty?: number | null; line_total_minor?: number | null }[];
  } | null;
  issues: { code: string; field: string; detail: string }[] | null;
};
export type ReceiptEdits = { merchant: string; date: string; total_minor: number; category: Category; note?: string };

export type Settings = { auto_read_receipts: boolean; notifications: boolean };

export type Recap = {
  month: string;
  total_minor: number;
  count: number;
  previous_total_minor: number;
  insight: { category: Category; change_percent: number; text: string } | null;
  categories: { category: Category; total_minor: number; count: number; share: number }[];
};

export type Budget = {
  month: string;
  limit_minor: number | null;
  spent_minor: number;
  remaining_minor: number | null;
  percent_used: number;
  status: "unset" | "on-track" | "near-limit" | "over";
  label: string;
  days_left: number;
};

export type Projection = {
  month: string;
  spent_minor: number;
  day_index: number;
  days_in_month: number;
  projected_minor: number | null;
  ready: boolean;
  detail: string;
};

export type CategoryBudget = {
  category: Category;
  spent_minor: number;
  limit_minor: number | null;
  over_minor: number | null;
  percent_used: number | null;
};
