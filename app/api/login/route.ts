import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

// The cookie value is a hash of the password, so a stolen cookie cannot
// reveal the password and the check needs no server-side session store.
function tokenFor(password: string) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const expected = process.env.APP_PASSWORD || "";
  if (!expected) {
    return NextResponse.json({ error: "APP_PASSWORD is not set on the server." }, { status: 500 });
  }
  if (password !== expected) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("auth", tokenFor(expected), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
  return res;
}

// Visiting /api/login?logout=1 clears the cookie and returns to the login page.
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("logout") === "1") {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.set("auth", "", { path: "/", maxAge: 0 });
    return res;
  }
  return NextResponse.redirect(new URL("/login", req.url));
}
