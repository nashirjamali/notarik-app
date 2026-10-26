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
