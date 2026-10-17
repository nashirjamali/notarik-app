import { createRefreshGate } from "@/lib/refresh";
import {
  accessTokenExpired,
  clearSession,
  getSession,
  restoreSession,
  saveSession,
  type Session,
} from "@/lib/session";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export type FieldError = { loc: string; message: string };

export class ApiError extends Error {
  status: number;
  code: string;
  details: FieldError[];

  constructor(status: number, code: string, message: string, details: FieldError[] = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const refreshGate = createRefreshGate();

async function parseError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as {
      code?: string;
      message?: string;
      details?: FieldError[];
    };
    return new ApiError(
      response.status,
      body.code ?? "error",
      body.message ?? response.statusText,
      body.details ?? [],
    );
  } catch {
    return new ApiError(response.status, "error", response.statusText);
  }
}

async function refreshSession(): Promise<boolean> {
  const current = getSession();
  if (!current) return false;
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: current.refreshToken }),
  });
  if (!response.ok) {
    await clearSession();
    return false;
  }
  const body = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    user_id: string;
  };
  await saveSession({
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    userId: body.user_id,
  });
  return true;
}

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const current = getSession();
  if (current) headers.set("Authorization", `Bearer ${current.accessToken}`);
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (response.status === 401 && retry && current) {
    const refreshed = await refreshGate(refreshSession);
    if (refreshed) return api<T>(path, init, false);
    await clearSession();
  }
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function bootstrapSession(): Promise<Session | null> {
  const restored = await restoreSession();
  if (!restored) return null;
  if (!accessTokenExpired(restored.accessToken)) return restored;
  const refreshed = await refreshGate(refreshSession);
  return refreshed ? getSession() : null;
}
