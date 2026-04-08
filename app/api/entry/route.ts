import { NextResponse } from "next/server";

import { getAccessToken, validateEntryName } from "@/lib/auth";
import { ACCESS_COOKIE_NAME } from "@/lib/constants";

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: string };

  if (!validateEntryName(body.name || "")) {
    return NextResponse.json({ error: "ARE YOU HER??? IF NOT GO AWAY😡." }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: getAccessToken(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60
  });
  return response;
}
