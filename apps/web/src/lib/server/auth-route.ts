import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { isSameSite } from "./guard";
import { setSession, type TokenPair } from "./session";
import { API_URL } from "./upstream";

/** Shared by /api/auth/login and /api/auth/signup: forward the credentials, keep the tokens in cookies. */
export async function authenticate(request: NextRequest, path: "/auth/login" | "/auth/signup") {
  if (!isSameSite(request)) {
    return NextResponse.json({ code: "forbidden", message: "Cross-site request blocked" }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "bad_request", message: "Invalid request" }, { status: 400 });
  }
  let upstream: Response;
  try {
    upstream = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ code: "unavailable", message: "Cannot reach the server. Try again." }, { status: 502 });
  }
  if (!upstream.ok) {
    const error = await upstream.json().catch(() => null);
    const message =
      upstream.status === 422
        ? "Check your details and try again"
        : typeof error?.message === "string"
          ? error.message
          : "Something went wrong";
    return NextResponse.json({ code: error?.code ?? "error", message }, { status: upstream.status });
  }
  const pair = (await upstream.json()) as TokenPair;
  const response = NextResponse.json({ ok: true });
  setSession(response, pair);
  return response;
}
