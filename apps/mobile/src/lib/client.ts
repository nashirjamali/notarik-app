import { File } from "expo-file-system";
import { Platform } from "react-native";

import { api, apiText } from "@/lib/api";
import type { components } from "@/lib/schema";
import type { Budget, CategoryBudget, ReceiptFile, ReceiptRun, Recap, TransactionInput } from "@/lib/types";

type Schemas = components["schemas"];

export function signup(body: Schemas["SignupRequest"]) {
  return api<Schemas["TokenPair"]>(
    "/auth/signup",
    { method: "POST", body: JSON.stringify(body) },
    false,
  );
}

export function login(body: Schemas["LoginRequest"]) {
  return api<Schemas["TokenPair"]>(
    "/auth/login",
    { method: "POST", body: JSON.stringify(body) },
    false,
  );
}

export function refresh(body: Schemas["RefreshRequest"]) {
  return api<Schemas["TokenPair"]>(
    "/auth/refresh",
    { method: "POST", body: JSON.stringify(body) },
    false,
  );
}

export function logout(body: Schemas["RefreshRequest"]) {
  return api<void>("/auth/logout", { method: "POST", body: JSON.stringify(body) });
}

export type Me = { user_id: string; name: string | null; email: string | null };
export type UserSettings = { auto_read_receipts: boolean; notifications: boolean };

export function getMe() {
  return api<Me>("/me");
}

export function getSettings() {
  return api<UserSettings>("/me/settings");
}

export function patchSettings(body: Partial<UserSettings>) {
  return api<UserSettings>("/me/settings", { method: "PATCH", body: JSON.stringify(body) });
}

export function exportTransactionsCsv() {
  return apiText("/transactions/export");
}

export function listTransactions(query: {
  month?: string;
  category?: Schemas["TransactionRead"]["category"];
  q?: string;
  cursor?: string | null;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (query.month) params.set("month", query.month);
  if (query.category) params.set("category", query.category);
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.cursor) params.set("cursor", query.cursor);
  if (query.limit) params.set("limit", String(query.limit));
  const queryString = params.toString();
  const suffix = queryString ? `?${queryString}` : "";
  return api<Schemas["TransactionPage"]>(`/transactions${suffix}`);
}

export function getTransaction(id: string) {
  return api<Schemas["TransactionRead"]>(`/transactions/${id}`);
}

export function createTransaction(body: Omit<Schemas["TransactionCreate"], "source">) {
  return api<Schemas["TransactionRead"]>("/transactions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateTransaction(id: string, body: Schemas["TransactionUpdate"]) {
  return api<Schemas["TransactionRead"]>(`/transactions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteTransaction(id: string) {
  return api<void>(`/transactions/${id}`, { method: "DELETE" });
}

export async function uploadReceipt(file: ReceiptFile) {
  const form = new FormData();
  if (Platform.OS === "web") {
    form.append("file", await (await fetch(file.uri)).blob(), file.name);
  } else {
    // Expo's fetch only accepts Blob-like parts (not RN's { uri } objects); File reads the local file.
    form.append("file", new File(file.uri) as unknown as Blob, file.name);
  }
  return api<ReceiptRun>("/receipts", { method: "POST", body: form });
}

export function getReceipt(id: string) {
  return api<ReceiptRun>(`/receipts/${id}`);
}

export function confirmReceipt(id: string, body: TransactionInput) {
  return api<{ transaction_id: string; user_edited_fields: string[] }>(
    `/receipts/${id}/confirm`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export function getRecap(month: string) {
  return api<Recap>(`/recap?month=${month}`);
}

export function getBudget(month: string) {
  return api<Budget>(`/budget?month=${month}`);
}

export function putBudget(month: string, totalMinor: number) {
  return api<Budget>("/budget", { method: "PUT", body: JSON.stringify({ month, total_minor: totalMinor }) });
}

export function getCategoryBudgets(month: string) {
  return api<CategoryBudget[]>(`/budget/categories?month=${month}`);
}

export function putCategoryBudget(month: string, category: CategoryBudget["category"], totalMinor: number | null) {
  return api<CategoryBudget[]>("/budget/categories", {
    method: "PUT",
    body: JSON.stringify({ month, category, total_minor: totalMinor }),
  });
}
