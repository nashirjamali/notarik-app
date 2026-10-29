import { NextResponse, type NextRequest } from "next/server";
import { isSameSite } from "@/lib/server/guard";
import { ACCESS_COOKIE, REFRESH_COOKIE, clearSession, setSession, type TokenPair } from "@/lib/server/session";
import { API_URL, refreshTokens } from "@/lib/server/upstream";

/** Only these API areas are reachable from the browser. Auth is owned by /api/auth/*. */
const ALLOWED = new Set(["transactions", "recap", "budget", "me", "projection", "chat", "receipts"]);
const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH"]);
/** The API accepts receipts up to 5 MB; leave room for the multipart envelope and refuse bigger bodies before buffering them. */
const MAX_BODY_BYTES = 6 * 1024 * 1024;

type Context = { params: Promise<{ path: string[] }> };

async function handle(request: NextRequest, { params }: Context) {
  const { path } = await params;
  if (!ALLOWED.has(path[0]) || path.some((part) => part === "" || part === "." || part === "..")) {
    return NextResponse.json({ code: "not_found", message: "Not found" }, { status: 404 });
  }
  if (!isSameSite(request)) {
    return NextResponse.json({ code: "forbidden", message: "Cross-site request blocked" }, { status: 403 });
  }

  const url = `${API_URL}/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) {
    return NextResponse.json({ code: "validation_error", message: "That file is too large" }, { status: 413 });
  }
  // Bytes, not text: receipts are binary, and the multipart boundary lives in the content type.
  const body = METHODS_WITH_BODY.has(request.method) ? await request.arrayBuffer() : undefined;
  const contentType = request.headers.get("content-type") ?? "application/json";
  const send = (token: string) =>
    fetch(url, {
      method: request.method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(body !== undefined ? { "content-type": contentType } : {}),
      },
      body,
      cache: "no-store",
    });

  let access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  let renewed: TokenPair | null = null;

  const renew = async () => {
    renewed = refresh ? await refreshTokens(refresh) : null;
    access = renewed?.access_token;
    return renewed !== null;
  };

  if (!access && !(await renew())) return signedOut();

  let upstream: Response;
  try {
    upstream = await send(access!);
    if (upstream.status === 401 && !renewed && (await renew())) upstream = await send(access!);
  } catch {
    return NextResponse.json({ code: "unavailable", message: "Cannot reach the server" }, { status: 502 });
  }
  if (upstream.status === 401) return signedOut();

  const response = new NextResponse(upstream.status === 204 ? null : upstream.body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json", "cache-control": "no-store" },
  });
  if (renewed) setSession(response, renewed);
  return response;
}

function signedOut() {
  const response = NextResponse.json({ code: "unauthorized", message: "Signed out" }, { status: 401 });
  clearSession(response);
  return response;
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
