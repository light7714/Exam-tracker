"use client";

import { FormEvent, useMemo, useState } from "react";

import { RevisionBoard as RevisionBoardType, RevisionChapter, RevisionStatus, RevisionUnit, STATUS_OPTIONS, Subject } from "@/lib/types";

type RevisionBoardProps = {
  initialBoard: RevisionBoardType;
};

const subjectMeta: Array<{ key: Subject; label: string }> = [
  { key: "physics", label: "Physics" },
  { key: "chemistry", label: "Chemistry" },
  { key: "zoology", label: "Zoology" },
  { key: "botany", label: "Botany" }
];

const statusLabels: Record<RevisionStatus, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  done: "Done"
};

export function RevisionBoard({ initialBoard }: RevisionBoardProps) {
  const [board, setBoard] = useState(initialBoard);
  const [chapterDrafts, setChapterDrafts] = useState<Record<Subject, string>>({
    physics: "",
    chemistry: "",
    zoology: "",
    botany: ""
  });
  const [unitDrafts, setUnitDrafts] = useState<Record<string, string>>({});
  const [expandedUnitForms, setExpandedUnitForms] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");

  const progress = useMemo(() => {
    const chapters = Object.values(board).flat();
    const total = chapters.length + chapters.reduce((count, chapter) => count + chapter.units.length, 0);
    const done =
      chapters.filter((chapter) => chapter.status === "done").length +
      chapters.reduce((count, chapter) => count + chapter.units.filter((unit) => unit.status === "done").length, 0);

    return { total, done };
  }, [board]);

  const subjectProgress = useMemo(() => {
    return Object.fromEntries(
      subjectMeta.map((subject) => {
        const chapters = board[subject.key];
        const total = chapters.length + chapters.reduce((count, chapter) => count + chapter.units.length, 0);
        const done =
          chapters.filter((chapter) => chapter.status === "done").length +
          chapters.reduce((count, chapter) => count + chapter.units.filter((unit) => unit.status === "done").length, 0);

        return [
          subject.key,
          {
            total,
            done,
            percentage: total ? Math.round((done / total) * 100) : 0
          }
        ];
      })
    ) as Record<Subject, { total: number; done: number; percentage: number }>;
  }, [board]);

  async function createChapter(event: FormEvent<HTMLFormElement>, subject: Subject) {
    event.preventDefault();
    const title = chapterDrafts[subject].trim();

    if (!title) {
      return;
    }

    setError("");

    try {
      const response = await fetch("/api/revision/chapters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ subject, title })
      });

      const data = (await response.json()) as { chapter?: RevisionChapter; error?: string };

      if (!response.ok || !data.chapter) {
        throw new Error(data.error || "Unable to add chapter.");
      }

      setBoard((current) => ({
        ...current,
        [subject]: [...current[subject], data.chapter!]
      }));
      setChapterDrafts((current) => ({ ...current, [subject]: "" }));
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to add chapter.");
    }
  }

  async function updateChapter(chapterId: string, payload: Partial<Pick<RevisionChapter, "title" | "status">>) {
    if (payload.title !== undefined && !payload.title.trim()) {
      setError("Chapter title cannot be empty.");
      return;
    }

    setError("");

    try {
      const response = await fetch("/api/revision/chapters", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ id: chapterId, ...payload })
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to update chapter.");
      }

      setBoard((current) => {
        const next = { ...current };

        for (const subject of subjectMeta) {
          next[subject.key] = next[subject.key].map((chapter) =>
            chapter.id === chapterId ? { ...chapter, ...payload } : chapter
          );
        }

        return next;
      });
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update chapter.");
    }
  }

  async function createUnit(event: FormEvent<HTMLFormElement>, chapterId: string) {
    event.preventDefault();
    const title = (unitDrafts[chapterId] || "").trim();

    if (!title) {
      return;
    }

    setError("");

    try {
      const response = await fetch("/api/revision/units", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ chapterId, title })
      });

      const data = (await response.json()) as { unit?: RevisionUnit; error?: string };

      if (!response.ok || !data.unit) {
        throw new Error(data.error || "Unable to add unit.");
      }

      setBoard((current) => {
        const next = { ...current };

        for (const subject of subjectMeta) {
          next[subject.key] = next[subject.key].map((chapter) =>
            chapter.id === chapterId ? { ...chapter, units: [...chapter.units, data.unit!] } : chapter
          );
        }

        return next;
      });
      setUnitDrafts((current) => ({ ...current, [chapterId]: "" }));
      setExpandedUnitForms((current) => ({ ...current, [chapterId]: false }));
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to add unit.");
    }
  }

  function statusClassName(status: RevisionStatus) {
    return `status-select status-select--${status}`;
  }

  async function updateUnit(unitId: string, payload: Partial<Pick<RevisionUnit, "title" | "status">>) {
    if (payload.title !== undefined && !payload.title.trim()) {
      setError("Unit title cannot be empty.");
      return;
    }

    setError("");

    try {
      const response = await fetch("/api/revision/units", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ id: unitId, ...payload })
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to update unit.");
      }

      setBoard((current) => {
        const next = { ...current };

        for (const subject of subjectMeta) {
          next[subject.key] = next[subject.key].map((chapter) => ({
            ...chapter,
            units: chapter.units.map((unit) => (unit.id === unitId ? { ...unit, ...payload } : unit))
          }));
        }

        return next;
      });
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update unit.");
    }
  }

  return (
    <section className="revision-shell">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Revision Board</p>
          <h2>Track chapters and units</h2>
        </div>

        <div className="progress-card">
          <span>{progress.done} done</span>
          <strong>{progress.total ? Math.round((progress.done / progress.total) * 100) : 0}% complete</strong>
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="revision-grid">
        {subjectMeta.map((subject) => (
          <section key={subject.key} className="subject-card">
            <div className="subject-card__header">
              <div>
                <h3>{subject.label}</h3>
                <p className="subject-progress-text">
                  {subjectProgress[subject.key].done}/{subjectProgress[subject.key].total} complete
                </p>
              </div>
              <div className="subject-summary">
                <span className="subject-count">{board[subject.key].length} chapters</span>
                <div className="subject-progress-pill">
                  <strong>{subjectProgress[subject.key].percentage}%</strong>
                </div>
              </div>
            </div>

            <div className="subject-progress-bar" aria-hidden="true">
              <span style={{ width: `${subjectProgress[subject.key].percentage}%` }} />
            </div>

            <form className="inline-form" onSubmit={(event) => createChapter(event, subject.key)}>
              <input
                type="text"
                value={chapterDrafts[subject.key]}
                onChange={(event) => setChapterDrafts((current) => ({ ...current, [subject.key]: event.target.value }))}
                placeholder="Add chapter"
              />
              <button type="submit" className="secondary-button">
                Add
              </button>
            </form>

            <div className="chapter-list">
              {board[subject.key].length ? (
                board[subject.key].map((chapter) => (
                  <article key={chapter.id} className="chapter-card">
                    <div className="chapter-card__row">
                      <input
                        type="text"
                        value={chapter.title}
                        onChange={(event) => {
                          const title = event.target.value;
                          setBoard((current) => ({
                            ...current,
                            [subject.key]: current[subject.key].map((item) =>
                              item.id === chapter.id ? { ...item, title } : item
                            )
                          }));
                        }}
                        onBlur={(event) => updateChapter(chapter.id, { title: event.target.value })}
                        className="editable-input"
                      />
                      <select
                        value={chapter.status}
                        onChange={(event) => updateChapter(chapter.id, { status: event.target.value as RevisionStatus })}
                        className={statusClassName(chapter.status)}
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {statusLabels[status]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="unit-controls">
                      <button
                        type="button"
                        className="unit-toggle"
                        onClick={() =>
                          setExpandedUnitForms((current) => ({
                            ...current,
                            [chapter.id]: !current[chapter.id]
                          }))
                        }
                      >
                        {expandedUnitForms[chapter.id] ? "Hide unit form" : "Add unit"}
                      </button>

                      {expandedUnitForms[chapter.id] ? (
                        <form className="inline-form inline-form--unit" onSubmit={(event) => createUnit(event, chapter.id)}>
                          <input
                            type="text"
                            value={unitDrafts[chapter.id] || ""}
                            onChange={(event) => setUnitDrafts((current) => ({ ...current, [chapter.id]: event.target.value }))}
                            placeholder="Add unit (optional)"
                          />
                          <button type="submit" className="ghost-button">
                            Save unit
                          </button>
                        </form>
                      ) : null}
                    </div>

                    {chapter.units.length ? (
                      <div className="unit-list">
                        {chapter.units.map((unit) => (
                          <div key={unit.id} className="unit-row">
                            <input
                              type="text"
                              value={unit.title}
                              onChange={(event) => {
                                const title = event.target.value;
                                setBoard((current) => ({
                                  ...current,
                                  [subject.key]: current[subject.key].map((item) =>
                                    item.id === chapter.id
                                      ? {
                                          ...item,
                                          units: item.units.map((currentUnit) =>
                                            currentUnit.id === unit.id ? { ...currentUnit, title } : currentUnit
                                          )
                                        }
                                      : item
                                  )
                                }));
                              }}
                              onBlur={(event) => updateUnit(unit.id, { title: event.target.value })}
                              className="editable-input editable-input--unit"
                            />
                            <select
                              value={unit.status}
                              onChange={(event) => updateUnit(unit.id, { status: event.target.value as RevisionStatus })}
                              className={statusClassName(unit.status)}
                            >
                              {STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                  {statusLabels[status]}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="empty-card">
                  <p>No chapters added yet.</p>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
