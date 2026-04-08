import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACCESS_COOKIE_NAME } from "@/lib/constants";

const ACCESS_SECRET = process.env.ACCESS_COOKIE_SECRET || "exam-tracker-soft-gate";

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function createAccessToken() {
  const expectedName = normalizeName(process.env.SITE_ENTRY_NAME || "");
  return createHash("sha256").update(`${expectedName}:${ACCESS_SECRET}`).digest("hex");
}

export function validateEntryName(name: string) {
  const expectedName = normalizeName(process.env.SITE_ENTRY_NAME || "");

  if (!expectedName) {
    return false;
  }

  return normalizeName(name) === expectedName;
}

export function getAccessToken() {
  return createAccessToken();
}

export async function hasAccess() {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_COOKIE_NAME)?.value === createAccessToken();
}

export async function requireAccess() {
  if (!(await hasAccess())) {
    redirect("/");
  }
}
