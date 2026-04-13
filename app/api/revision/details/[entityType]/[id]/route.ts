import { NextResponse } from "next/server";

import { hasAccess } from "@/lib/auth";
import { saveRevisionDetail } from "@/lib/store";
import {
  REVISION_CHECKLIST_GROUPS,
  REVISION_DETAIL_TYPES,
  RevisionChecklist,
  RevisionChecklistItem,
  RevisionDetailType
} from "@/lib/types";

function normalizeChecklistItem(item: Partial<RevisionChecklistItem>) {
  return {
    id: item.id || "",
    text: (item.text || "").trim(),
    checked: Boolean(item.checked)
  } satisfies RevisionChecklistItem;
}

function normalizeChecklist(checklist?: Partial<RevisionChecklist>): RevisionChecklist {
  return Object.fromEntries(
    REVISION_CHECKLIST_GROUPS.map((group) => [
      group,
      ((checklist?.[group] || []) as Partial<RevisionChecklistItem>[])
        .map((item) => normalizeChecklistItem(item))
        .filter((item) => item.text)
    ])
  ) as RevisionChecklist;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ entityType: string; id: string }> }
) {
  if (!(await hasAccess())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { entityType, id } = await params;

    if (!REVISION_DETAIL_TYPES.includes(entityType as RevisionDetailType)) {
      return NextResponse.json({ error: "Invalid revision detail type." }, { status: 400 });
    }

    if (!id) {
      return NextResponse.json({ error: "Missing revision detail id." }, { status: 400 });
    }

    const body = (await request.json()) as { notesHtml?: string; checklist?: Partial<RevisionChecklist> };
    const result = await saveRevisionDetail(entityType as RevisionDetailType, id, {
      notesHtml: body.notesHtml || "",
      checklist: normalizeChecklist(body.checklist)
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save revision notes." },
      { status: 500 }
    );
  }
}
