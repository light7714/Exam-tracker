import { NextResponse } from "next/server";

import { hasAccess } from "@/lib/auth";
import { isValidDateString } from "@/lib/date-utils";
import { saveDayNotes } from "@/lib/store";
import { FONT_SCALES } from "@/lib/types";

export async function PATCH(request: Request, { params }: { params: Promise<{ date: string }> }) {
  if (!(await hasAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { date } = await params;

    if (!isValidDateString(date)) {
      return NextResponse.json({ error: "Invalid date." }, { status: 400 });
    }

    const body = (await request.json()) as { notesHtml?: string; fontScale?: string };

    if (!FONT_SCALES.includes((body.fontScale || "md") as (typeof FONT_SCALES)[number])) {
      return NextResponse.json({ error: "Invalid font scale." }, { status: 400 });
    }

    await saveDayNotes(date, body.notesHtml || "", body.fontScale as (typeof FONT_SCALES)[number]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save notes." },
      { status: 500 }
    );
  }
}
