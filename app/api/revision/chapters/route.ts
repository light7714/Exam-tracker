import { NextResponse } from "next/server";

import { hasAccess } from "@/lib/auth";
import { createRevisionChapter, updateRevisionChapter } from "@/lib/store";
import { STATUS_OPTIONS, SUBJECTS } from "@/lib/types";

export async function POST(request: Request) {
  if (!(await hasAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { subject?: string; title?: string };

    if (!SUBJECTS.includes((body.subject || "") as (typeof SUBJECTS)[number])) {
      return NextResponse.json({ error: "Invalid subject." }, { status: 400 });
    }

    const chapter = await createRevisionChapter(body.subject as (typeof SUBJECTS)[number], body.title || "");
    return NextResponse.json({ chapter });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create chapter." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!(await hasAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { id?: string; title?: string; status?: string };

    if (!body.id) {
      return NextResponse.json({ error: "Missing chapter id." }, { status: 400 });
    }

    if (body.status && !STATUS_OPTIONS.includes(body.status as (typeof STATUS_OPTIONS)[number])) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    await updateRevisionChapter(body.id, {
      title: body.title,
      status: body.status as (typeof STATUS_OPTIONS)[number] | undefined
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update chapter." },
      { status: 500 }
    );
  }
}
