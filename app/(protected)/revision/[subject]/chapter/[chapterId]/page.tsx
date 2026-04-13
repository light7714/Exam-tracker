import { notFound } from "next/navigation";

import { RevisionDetailEditor } from "@/components/revision-detail-editor";
import { getRevisionDetail } from "@/lib/store";
import { SUBJECTS, Subject } from "@/lib/types";

export default async function RevisionChapterPage({
  params
}: {
  params: Promise<{ subject: string; chapterId: string }>;
}) {
  const { subject, chapterId } = await params;

  if (!SUBJECTS.includes(subject as Subject)) {
    notFound();
  }

  try {
    const detail = await getRevisionDetail("chapter", chapterId);

    if (detail.subject !== subject) {
      notFound();
    }

    return <RevisionDetailEditor detail={detail} />;
  } catch (error) {
    if (error instanceof Error && error.message === "Chapter not found.") {
      notFound();
    }

    throw error;
  }
}
