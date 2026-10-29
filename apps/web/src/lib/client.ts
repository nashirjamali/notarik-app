import type {
  Budget,
  Category,
  CategoryBudget,
  Me,
  Projection,
  Recap,
  Transaction,
  TransactionInput,
  TransactionPage,
  TransactionPatch,
} from "./types";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Calls go to our own origin (/api/proxy); the browser never sees a token. */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/proxy${path}`, {
    ...init,
    headers: init?.body ? { "content-type": "application/json" } : undefined,
  });
  if (res.status === 401 && typeof window !== "undefined") {
    // A full navigation on purpose: it drops every cached query and React state of the signed-out session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
    throw new ApiError(401, "Signed out");
  }
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new ApiError(res.status, typeof error?.message === "string" ? error.message : "Something went wrong");
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const getMe = () => request<Me>("/me");
export const getRecap = (month: string) => request<Recap>(`/recap?month=${month}`);
export const getProjection = (month: string) => request<Projection>(`/projection?month=${month}`);
export const getCategoryBudgets = (month: string) => request<CategoryBudget[]>(`/budget/categories?month=${month}`);
export const putBudget = (month: string, totalMinor: number) =>
  request<Budget>("/budget", { method: "PUT", body: JSON.stringify({ month, total_minor: totalMinor }) });
export const getBudget = (month: string) => request<Budget>(`/budget?month=${month}`);

export function listTransactions(query: { month: string; category?: Category; q?: string; cursor?: string | null; limit?: number }) {
  const params = new URLSearchParams({ month: query.month });
  if (query.category) params.set("category", query.category);
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.cursor) params.set("cursor", query.cursor);
  if (query.limit) params.set("limit", String(query.limit));
  return request<TransactionPage>(`/transactions?${params}`);
}

export const getTransaction = (id: string) => request<Transaction>(`/transactions/${encodeURIComponent(id)}`);
export const createTransaction = (body: TransactionInput) =>
  request<Transaction>("/transactions", { method: "POST", body: JSON.stringify(body) });
export const updateTransaction = (id: string, body: TransactionPatch) =>
  request<Transaction>(`/transactions/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) });
export const deleteTransaction = (id: string) => request<void>(`/transactions/${encodeURIComponent(id)}`, { method: "DELETE" });

/** Every expense as a CSV file, saved through the browser's download. */
export async function downloadCsv() {
  const res = await fetch("/api/proxy/transactions/export");
  if (!res.ok) throw new ApiError(res.status, "Could not export your expenses");
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = "notarik-expenses.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export async function signOut() {
  await fetch("/api/auth/logout", { method: "POST" });
}
