import { notFound } from "next/navigation";

import { RevisionDetailEditor } from "@/components/revision-detail-editor";
import { requireAccess } from "@/lib/auth";
import { getRevisionDetail } from "@/lib/store";
import { SUBJECTS, Subject } from "@/lib/types";

export default async function RevisionUnitPage({
  params
}: {
  params: Promise<{ subject: string; unitId: string }>;
}) {
  await requireAccess();

  const { subject, unitId } = await params;

  if (!SUBJECTS.includes(subject as Subject)) {
    notFound();
  }

  try {
    const detail = await getRevisionDetail("unit", unitId);

    if (detail.subject !== subject) {
      notFound();
    }

    return <RevisionDetailEditor detail={detail} />;
  } catch (error) {
    if (error instanceof Error && error.message === "Unit not found.") {
      notFound();
    }

    throw error;
  }
}
