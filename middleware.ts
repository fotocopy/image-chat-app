import { NextRequest, NextResponse } from "next/server";

// Middleware runs on the Edge runtime, so we use the Web Crypto API
// (available as globalThis.crypto) rather than Node's crypto module.
async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public paths that must stay reachable without a cookie.
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/login") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const expected = process.env.APP_PASSWORD || "";
  const cookie = req.cookies.get("auth")?.value;

  if (expected && cookie && cookie === (await sha256Hex(expected))) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
