import { NextResponse, type NextRequest } from "next/server";
import { isSameSite } from "@/lib/server/guard";
import { REFRESH_COOKIE, clearSession } from "@/lib/server/session";
import { API_URL } from "@/lib/server/upstream";

export async function POST(request: NextRequest) {
  if (!isSameSite(request)) {
    return NextResponse.json({ code: "forbidden", message: "Cross-site request blocked" }, { status: 403 });
  }
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    // Revoke the token on the server; the cookies are cleared even if the API is down.
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    }).catch(() => null);
  }
  const response = new NextResponse(null, { status: 204 });
  clearSession(response);
  return response;
}
