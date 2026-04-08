import Link from "next/link";
import { notFound } from "next/navigation";

import { NotesEditor } from "@/components/notes-editor";
import { requireAccess } from "@/lib/auth";
import { formatLongDate, isValidDateString } from "@/lib/date-utils";
import { getDayEntry } from "@/lib/store";

export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  await requireAccess();
  const { date } = await params;

  if (!isValidDateString(date)) {
    notFound();
  }

  const entry = await getDayEntry(date);

  return (
    <section className="day-page">
      <div className="day-page__header">
        <div>
          <Link href="/calendar" className="back-link">
            ← Back to calendar
          </Link>
          <p className="eyebrow">Date Notes</p>
          <h2>{formatLongDate(date)}</h2>
        </div>
      </div>

      <NotesEditor
        date={date}
        initialNotesHtml={entry.notesHtml}
        initialMockTests={entry.mockTests}
      />
    </section>
  );
}
