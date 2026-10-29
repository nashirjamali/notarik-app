import "server-only";
import type { NextRequest } from "next/server";

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF defence for state-changing requests, on top of SameSite=Lax: the browser must say the request comes from
 * this site. Browsers always send Origin on cross-origin POSTs; requests without it must not be cross-site.
 */
export function isSameSite(request: NextRequest): boolean {
  if (SAFE.has(request.method)) return true;
  const origin = request.headers.get("origin");
  if (origin) {
    // Compare with the host the browser connected to (nextUrl.origin can differ behind a proxy or with -H).
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    try {
      return host !== null && new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  const site = request.headers.get("sec-fetch-site");
  return site === null || site === "same-origin" || site === "none";
}
