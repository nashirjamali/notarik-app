import "server-only";
import type { NextResponse } from "next/server";

export const ACCESS_COOKIE = "nt_access";
export const REFRESH_COOKIE = "nt_refresh";

const ACCESS_SECONDS = 15 * 60;
const REFRESH_SECONDS = 30 * 24 * 60 * 60;

export type TokenPair = { access_token: string; refresh_token: string };

/**
 * Tokens live only in httpOnly cookies: JavaScript in the page can never read them.
 * SameSite=Lax keeps them off cross-site POSTs; the Origin check in guard.ts covers the rest.
 * COOKIE_INSECURE=1 is for tests that run a production build over plain http.
 */
function options(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_INSECURE !== "1",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function setSession(response: NextResponse, pair: TokenPair) {
  response.cookies.set(ACCESS_COOKIE, pair.access_token, options(ACCESS_SECONDS));
  response.cookies.set(REFRESH_COOKIE, pair.refresh_token, options(REFRESH_SECONDS));
}

export function clearSession(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", options(0));
  response.cookies.set(REFRESH_COOKIE, "", options(0));
}
