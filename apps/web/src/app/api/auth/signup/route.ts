import type { NextRequest } from "next/server";
import { authenticate } from "@/lib/server/auth-route";

export function POST(request: NextRequest) {
  return authenticate(request, "/auth/signup");
}
