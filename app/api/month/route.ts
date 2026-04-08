import { NextResponse } from "next/server";

import { hasAccess } from "@/lib/auth";
import { getMonthSummaries } from "@/lib/store";

export async function GET(request: Request) {
  if (!(await hasAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Invalid month." }, { status: 400 });
    }

    const summaries = await getMonthSummaries(month);
    return NextResponse.json({ summaries });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load month data." },
      { status: 500 }
    );
  }
}
