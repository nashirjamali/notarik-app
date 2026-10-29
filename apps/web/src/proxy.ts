import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic check only: no session cookie means no app. Whether the session is still valid is decided by the API
 * on every data request (a 401 sends the browser back to /login).
 */
export function proxy(request: NextRequest) {
  const signedIn = request.cookies.has("nt_refresh");
  const { pathname } = request.nextUrl;
  const toAuth = pathname === "/login" || pathname === "/signup";
  if (!signedIn && !toAuth) return NextResponse.redirect(new URL("/login", request.url));
  if (signedIn && toAuth) return NextResponse.redirect(new URL("/app", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/app/:path*", "/login", "/signup"] };
