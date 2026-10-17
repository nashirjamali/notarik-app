import { api } from "@/lib/api";
import type { components } from "@/lib/schema";

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

export function listTransactions(query: {
  month?: string;
  category?: Schemas["TransactionRead"]["category"];
  cursor?: string | null;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (query.month) params.set("month", query.month);
  if (query.category) params.set("category", query.category);
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
