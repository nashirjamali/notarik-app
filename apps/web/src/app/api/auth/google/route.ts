import type { NextRequest } from "next/server";
import { authenticate } from "@/lib/server/auth-route";

/** The browser sends Google's ID token and the nonce it set; the provider is fixed here, never chosen by the client. */
export function POST(request: NextRequest) {
  return authenticate(request, "/auth/social", (body) => {
    const { id_token, nonce } = (body ?? {}) as { id_token?: unknown; nonce?: unknown };
    if (typeof id_token !== "string" || typeof nonce !== "string" || !id_token || !nonce) return null;
    return { provider: "google", id_token, nonce };
  });
}
