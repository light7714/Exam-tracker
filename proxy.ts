import { NextRequest, NextResponse } from "next/server";

import { ACCESS_COOKIE_NAME } from "@/lib/constants";

const ACCESS_SECRET = process.env.ACCESS_COOKIE_SECRET || "exam-tracker-soft-gate";

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

async function createAccessToken() {
  const expectedName = normalizeName(process.env.SITE_ENTRY_NAME || "");
  const encoder = new TextEncoder();
  const buffer = encoder.encode(`${expectedName}:${ACCESS_SECRET}`);
  const digest = await crypto.subtle.digest("SHA-256", buffer);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hasPageAccess(request: NextRequest) {
  return request.cookies.get(ACCESS_COOKIE_NAME)?.value === (await createAccessToken());
}

export async function proxy(request: NextRequest) {
  if (await hasPageAccess(request)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  matcher: ["/calendar/:path*", "/revision/:path*"]
};
