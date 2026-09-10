import { NextResponse, type NextRequest } from "next/server";

import { verifyEmail } from "@/lib/auth-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/signin?error=verification", request.url));
  try {
    await verifyEmail(token);
    return NextResponse.redirect(new URL("/signin?verified=1", request.url));
  } catch {
    return NextResponse.redirect(new URL("/signin?error=verification", request.url));
  }
}
