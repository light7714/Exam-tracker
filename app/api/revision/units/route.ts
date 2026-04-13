import { NextResponse } from "next/server";

import { hasAccess } from "@/lib/auth";
import { createRevisionUnit, updateRevisionUnit } from "@/lib/store";
import { STATUS_OPTIONS } from "@/lib/types";

export async function POST(request: Request) {
  if (!(await hasAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { chapterId?: string; title?: string };

    if (!body.chapterId) {
      return NextResponse.json({ error: "Missing chapter id." }, { status: 400 });
    }

    const result = await createRevisionUnit(body.chapterId, body.title || "");
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create unit." },
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
      return NextResponse.json({ error: "Missing unit id." }, { status: 400 });
    }

    if (body.status && !STATUS_OPTIONS.includes(body.status as (typeof STATUS_OPTIONS)[number])) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    const result = await updateRevisionUnit(body.id, {
      title: body.title,
      status: body.status as (typeof STATUS_OPTIONS)[number] | undefined
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update unit." },
      { status: 500 }
    );
  }
}
