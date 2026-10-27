import type { components } from "@/lib/schema";

type Schemas = components["schemas"];

export type Item = Schemas["ItemRead"];
export type Transaction = Schemas["TransactionRead"];
export type TransactionPage = Schemas["TransactionPage"];
export type ItemInput = Schemas["ItemIn"];
export type TransactionInput = Omit<Schemas["TransactionCreate"], "source">;
export type TokenPair = Schemas["TokenPair"];

export type ReceiptDraft = {
  merchant: string | null;
  date: string | null;
  total_minor: number | null;
  subtotal_minor: number | null;
  category: Transaction["category"];
  items: { name: string; qty: number | null; line_total_minor: number | null }[];
  source: "photo" | "pdf" | "manual" | "chat";
  field_confidence: Record<string, number>;
};

export type ReceiptIssue = { code: string; field: string; detail: string };

export type ReceiptRun = {
  id: string;
  status: string;
  draft: ReceiptDraft | null;
  issues: ReceiptIssue[] | null;
  trace: { step: string; message: string }[] | null;
  content_type: string;
};

export type ReceiptFile = { uri: string; name: string; mimeType: string };

export type PaymentMethod = NonNullable<Transaction["payment_method"]>;

export const paymentMethods: PaymentMethod[] = [
  "Cash",
  "QRIS",
  "Debit card",
  "Credit card",
  "E-wallet",
  "Bank transfer",
  "Other",
];

export type Recap = {
  month: string;
  total_minor: number;
  count: number;
  previous_total_minor: number;
  insight: { category: Transaction["category"]; change_percent: number; text: string } | null;
  categories: { category: Transaction["category"]; total_minor: number; count: number; share: number }[];
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

export type CategoryBudget = {
  category: Transaction["category"];
  spent_minor: number;
  limit_minor: number | null;
  over_minor: number | null;
  percent_used: number | null;
};
