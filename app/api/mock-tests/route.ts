import { NextResponse } from "next/server";

import { hasAccess } from "@/lib/auth";
import { isValidDateString } from "@/lib/date-utils";
import { deleteMockTest, upsertMockTest } from "@/lib/store";
import { MockTestPayload } from "@/lib/types";

export async function POST(request: Request) {
  if (!(await hasAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as MockTestPayload;

    if (!isValidDateString(body.date)) {
      return NextResponse.json({ error: "Invalid date." }, { status: 400 });
    }

    if ((body.label || "").trim().length > 10) {
      return NextResponse.json({ error: "Label can be at most 10 characters." }, { status: 400 });
    }

    const values = [body.physics, body.chemistry, body.zoology, body.botany];

    if (values.some((value) => Number.isNaN(value) || value < 0)) {
      return NextResponse.json({ error: "Marks must be zero or higher." }, { status: 400 });
    }

    if (values.some((value) => value > 180)) {
      return NextResponse.json({ error: "Each subject mark must be 180 or lower." }, { status: 400 });
    }

    const test = await upsertMockTest(body);
    return NextResponse.json({ test });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save mock test." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!(await hasAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { id?: string };

    if (!body.id) {
      return NextResponse.json({ error: "Missing mock test id." }, { status: 400 });
    }

    await deleteMockTest(body.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete mock test." },
      { status: 500 }
    );
  }
}
