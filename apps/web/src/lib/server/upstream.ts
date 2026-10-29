import "server-only";
import type { TokenPair } from "./session";

export const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

/**
 * The API rotates refresh tokens: a token works once. If two parallel requests both hit an expired access token,
 * the second refresh would fail and log the user out. Concurrent refreshes with the same token share one call.
 * (Per server instance; with several instances a sticky route or a shared lock would be needed.)
 */
const inflight = new Map<string, Promise<TokenPair | null>>();

export function refreshTokens(refreshToken: string): Promise<TokenPair | null> {
  const existing = inflight.get(refreshToken);
  if (existing) return existing;
  const call = fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
  })
    .then(async (res) => (res.ok ? ((await res.json()) as TokenPair) : null))
    .catch(() => null)
    .finally(() => {
      // Keep the result briefly so a request that arrives just after still reuses it.
      setTimeout(() => inflight.delete(refreshToken), 5_000);
    });
  inflight.set(refreshToken, call);
  return call;
}
