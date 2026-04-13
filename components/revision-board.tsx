"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import {
  ChemistrySection,
  RevisionBoard as RevisionBoardType,
  RevisionChapter,
  RevisionStatus,
  RevisionUnit,
  STATUS_OPTIONS,
  Subject
} from "@/lib/types";

type RevisionBoardProps = {
  initialBoard: RevisionBoardType;
};

type RevisionUnitCreateResponse = {
  unit?: RevisionUnit;
  chapterId?: string;
  chapterStatus?: RevisionStatus;
  error?: string;
};

type RevisionUnitUpdateResponse = {
  chapterId?: string;
  chapterStatus?: RevisionStatus;
  error?: string;
};

type RevisionUnitDeleteResponse = {
  chapterId?: string;
  chapterStatus?: RevisionStatus;
  error?: string;
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

const chemistrySectionMeta: Array<{ key: ChemistrySection; label: string }> = [
  { key: "organic-chemistry", label: "Organic Chemistry" },
  { key: "inorganic-chemistry", label: "Inorganic Chemistry" },
  { key: "physical-chemistry", label: "Physical Chemistry" }
];

function getChapterDraftKey(subject: Subject, chemistrySection?: ChemistrySection) {
  return subject === "chemistry" && chemistrySection ? `chemistry:${chemistrySection}` : subject;
}

export function RevisionBoard({ initialBoard }: RevisionBoardProps) {
  const [board, setBoard] = useState(initialBoard);
  const [chapterDrafts, setChapterDrafts] = useState<Record<string, string>>({
    physics: "",
    zoology: "",
    botany: "",
    "chemistry:organic-chemistry": "",
    "chemistry:inorganic-chemistry": "",
    "chemistry:physical-chemistry": ""
  });
  const [unitDrafts, setUnitDrafts] = useState<Record<string, string>>({});
  const [expandedUnitForms, setExpandedUnitForms] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [creatingChapterKey, setCreatingChapterKey] = useState<string | null>(null);
  const [creatingUnitChapterId, setCreatingUnitChapterId] = useState<string | null>(null);
  const [updatingChapterStatusId, setUpdatingChapterStatusId] = useState<string | null>(null);
  const [updatingUnitStatusId, setUpdatingUnitStatusId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    | { entityType: "chapter" | "unit"; id: string; title: string; subject: Subject }
    | null
  >(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function resizeTextarea(element: HTMLTextAreaElement | null) {
    if (!element) {
      return;
    }

    element.style.height = "0px";
    element.style.height = `${element.scrollHeight}px`;
  }

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
        const chapterTotal = chapters.length;
        const chapterDone = chapters.filter((chapter) => chapter.status === "done").length;
        const total = chapterTotal + chapters.reduce((count, chapter) => count + chapter.units.length, 0);
        const done =
          chapters.filter((chapter) => chapter.status === "done").length +
          chapters.reduce((count, chapter) => count + chapter.units.filter((unit) => unit.status === "done").length, 0);

        return [
          subject.key,
          {
            chapterTotal,
            chapterDone,
            percentage: total ? Math.round((done / total) * 100) : 0
          }
        ];
      })
    ) as Record<Subject, { chapterTotal: number; chapterDone: number; percentage: number }>;
  }, [board]);

  async function createChapter(event: FormEvent<HTMLFormElement>, subject: Subject, chemistrySection?: ChemistrySection) {
    event.preventDefault();
    const draftKey = getChapterDraftKey(subject, chemistrySection);
    const title = (chapterDrafts[draftKey] || "").trim();

    if (!title) {
      return;
    }

    setError("");
    setCreatingChapterKey(draftKey);

    try {
      const response = await fetch("/api/revision/chapters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ subject, title, chemistrySection })
      });

      const data = (await response.json()) as { chapter?: RevisionChapter; error?: string };

      if (!response.ok || !data.chapter) {
        throw new Error(data.error || "Unable to add chapter.");
      }

      setBoard((current) => ({
        ...current,
        [subject]: [...current[subject], data.chapter!]
      }));
      setChapterDrafts((current) => ({ ...current, [draftKey]: "" }));
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to add chapter.");
    } finally {
      setCreatingChapterKey((current) => (current === draftKey ? null : current));
    }
  }

  async function updateChapter(chapterId: string, payload: Partial<Pick<RevisionChapter, "title" | "status">>) {
    if (payload.title !== undefined && !payload.title.trim()) {
      setError("Chapter title cannot be empty.");
      return;
    }

    setError("");
    const isStatusUpdate = payload.status !== undefined;

    if (isStatusUpdate) {
      setUpdatingChapterStatusId(chapterId);
    }

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
    } finally {
      if (isStatusUpdate) {
        setUpdatingChapterStatusId((current) => (current === chapterId ? null : current));
      }
    }
  }

  async function createUnit(event: FormEvent<HTMLFormElement>, chapterId: string) {
    event.preventDefault();
    const title = (unitDrafts[chapterId] || "").trim();

    if (!title) {
      return;
    }

    setError("");
    setCreatingUnitChapterId(chapterId);

    try {
      const response = await fetch("/api/revision/units", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ chapterId, title })
      });

      const data = (await response.json()) as RevisionUnitCreateResponse;

      if (!response.ok || !data.unit) {
        throw new Error(data.error || "Unable to add unit.");
      }

      setBoard((current) => {
        const next = { ...current };

        for (const subject of subjectMeta) {
          next[subject.key] = next[subject.key].map((chapter) =>
            chapter.id === chapterId
              ? {
                  ...chapter,
                  status: data.chapterStatus ?? chapter.status,
                  units: [...chapter.units, data.unit!]
                }
              : chapter
          );
        }

        return next;
      });
      setUnitDrafts((current) => ({ ...current, [chapterId]: "" }));
      setExpandedUnitForms((current) => ({ ...current, [chapterId]: false }));
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to add unit.");
    } finally {
      setCreatingUnitChapterId((current) => (current === chapterId ? null : current));
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
    const isStatusUpdate = payload.status !== undefined;

    if (isStatusUpdate) {
      setUpdatingUnitStatusId(unitId);
    }

    try {
      const response = await fetch("/api/revision/units", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ id: unitId, ...payload })
      });

      const data = (await response.json()) as RevisionUnitUpdateResponse;

      if (!response.ok) {
        throw new Error(data.error || "Unable to update unit.");
      }

      setBoard((current) => {
        const next = { ...current };

        for (const subject of subjectMeta) {
          next[subject.key] = next[subject.key].map((chapter) => ({
            ...chapter,
            status: chapter.id === data.chapterId && data.chapterStatus ? data.chapterStatus : chapter.status,
            units: chapter.units.map((unit) => (unit.id === unitId ? { ...unit, ...payload } : unit))
          }));
        }

        return next;
      });
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update unit.");
    } finally {
      if (isStatusUpdate) {
        setUpdatingUnitStatusId((current) => (current === unitId ? null : current));
      }
    }
  }

  async function deleteEntity() {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      if (deleteTarget.entityType === "chapter") {
        const response = await fetch(`/api/revision/chapters?id=${deleteTarget.id}`, { method: "DELETE" });
        const data = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(data.error || "Unable to delete chapter.");
        }

        setBoard((current) => ({
          ...current,
          [deleteTarget.subject]: current[deleteTarget.subject].filter((chapter) => chapter.id !== deleteTarget.id)
        }));
      } else {
        const response = await fetch(`/api/revision/units?id=${deleteTarget.id}`, { method: "DELETE" });
        const data = (await response.json()) as RevisionUnitDeleteResponse;

        if (!response.ok) {
          throw new Error(data.error || "Unable to delete unit.");
        }

        setBoard((current) => {
          const next = { ...current };

          for (const subject of subjectMeta) {
            next[subject.key] = next[subject.key].map((chapter) => ({
              ...chapter,
              status: chapter.id === data.chapterId && data.chapterStatus ? data.chapterStatus : chapter.status,
              units: chapter.units.filter((unit) => unit.id !== deleteTarget.id)
            }));
          }

          return next;
        });
      }

      setDeleteTarget(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : `Unable to delete ${deleteTarget.entityType}.`);
    } finally {
      setIsDeleting(false);
    }
  }

  function getChemistrySectionForChapter(chapter: RevisionChapter) {
    return chapter.chemistrySection || chemistrySectionMeta[0].key;
  }

  function renderChapterForm(subject: Subject, chemistrySection?: ChemistrySection) {
    const draftKey = getChapterDraftKey(subject, chemistrySection);
    const isLoading = creatingChapterKey === draftKey;

    return (
      <form className="inline-form" onSubmit={(event) => createChapter(event, subject, chemistrySection)}>
        <input
          type="text"
          value={chapterDrafts[draftKey] || ""}
          onChange={(event) => setChapterDrafts((current) => ({ ...current, [draftKey]: event.target.value }))}
          placeholder="Add chapter"
          disabled={isLoading}
        />
        <button type="submit" className="secondary-button" disabled={isLoading}>
          {isLoading ? (
            <span className="button-loader">
              <span className="spinner" aria-hidden="true" />
              Adding...
            </span>
          ) : (
            "Add"
          )}
        </button>
      </form>
    );
  }

  function renderChapterCard(subject: Subject, chapter: RevisionChapter) {
    return (
      <article key={chapter.id} className="chapter-card">
        <div className="chapter-card__row">
          <div className="entity-main-row">
            <textarea
              rows={1}
              value={chapter.title}
              ref={resizeTextarea}
              onInput={(event) => resizeTextarea(event.currentTarget)}
              onChange={(event) => {
                const title = event.target.value.replace(/\s*\n+\s*/g, " ");
                setBoard((current) => ({
                  ...current,
                  [subject]: current[subject].map((item) => (item.id === chapter.id ? { ...item, title } : item))
                }));
              }}
              onBlur={(event) => updateChapter(chapter.id, { title: event.target.value })}
              className="editable-input"
            />
            <Link
              href={`/revision/${subject}/chapter/${chapter.id}` as never}
              className="link-icon-button"
              aria-label={`Open notes for ${chapter.title || "this chapter"}`}
              title="Open notes"
            >
              ↗
            </Link>
          </div>
          <div className="status-action-row">
            <select
              value={chapter.status}
              onChange={(event) => updateChapter(chapter.id, { status: event.target.value as RevisionStatus })}
              className={statusClassName(chapter.status)}
              disabled={updatingChapterStatusId === chapter.id}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
            {updatingChapterStatusId === chapter.id ? <span className="status-spinner" aria-label="Updating status" /> : null}
            <button
              type="button"
              className="delete-icon-button"
              aria-label={`Delete ${chapter.title || "this chapter"}`}
              title="Delete"
              onClick={() =>
                setDeleteTarget({
                  entityType: "chapter",
                  id: chapter.id,
                  title: chapter.title || "this chapter",
                  subject
                })
              }
            >
              ×
            </button>
          </div>
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
                disabled={creatingUnitChapterId === chapter.id}
              />
              <button type="submit" className="ghost-button" disabled={creatingUnitChapterId === chapter.id}>
                {creatingUnitChapterId === chapter.id ? (
                  <span className="button-loader">
                    <span className="spinner spinner--accent" aria-hidden="true" />
                    Saving...
                  </span>
                ) : (
                  "Save unit"
                )}
              </button>
            </form>
          ) : null}
        </div>

        {chapter.units.length ? (
          <div className="unit-list">
            {chapter.units.map((unit) => (
              <div key={unit.id} className="unit-item">
                <div className="unit-row">
                  <div className="entity-main-row entity-main-row--unit">
                    <textarea
                      rows={1}
                      value={unit.title}
                      ref={resizeTextarea}
                      onInput={(event) => resizeTextarea(event.currentTarget)}
                      onChange={(event) => {
                        const title = event.target.value.replace(/\s*\n+\s*/g, " ");
                        setBoard((current) => ({
                          ...current,
                          [subject]: current[subject].map((item) =>
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
                    <Link
                      href={`/revision/${subject}/unit/${unit.id}` as never}
                      className="link-icon-button link-icon-button--unit"
                      aria-label={`Open notes for ${unit.title || "this unit"}`}
                      title="Open notes"
                    >
                      ↗
                    </Link>
                  </div>
                  <div className="status-action-row status-action-row--unit">
                    <select
                      value={unit.status}
                      onChange={(event) => updateUnit(unit.id, { status: event.target.value as RevisionStatus })}
                      className={statusClassName(unit.status)}
                      disabled={updatingUnitStatusId === unit.id}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {statusLabels[status]}
                        </option>
                      ))}
                    </select>
                    {updatingUnitStatusId === unit.id ? (
                      <span className="status-spinner status-spinner--unit" aria-label="Updating status" />
                    ) : null}
                    <button
                      type="button"
                      className="delete-icon-button delete-icon-button--unit"
                      aria-label={`Delete ${unit.title || "this unit"}`}
                      title="Delete"
                      onClick={() =>
                        setDeleteTarget({
                          entityType: "unit",
                          id: unit.id,
                          title: unit.title || "this unit",
                          subject
                        })
                      }
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </article>
    );
  }

  function renderChapterList(subject: Subject, chapters: RevisionChapter[], emptyMessage = "No chapters added yet.") {
    return (
      <div className="chapter-list">
        {chapters.length ? (
          chapters.map((chapter) => renderChapterCard(subject, chapter))
        ) : (
          <div className="empty-card">
            <p>{emptyMessage}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <section className="revision-shell">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Revision Board</p>
          <h2>Track chapters and units</h2>
        </div>

        <div className="revision-top-actions">
          <a href="#subject-zoology" className="jump-link">
            Go to Biology sections
          </a>
          <div className="progress-card">
            <span>{progress.done} done</span>
            <strong>{progress.total ? Math.round((progress.done / progress.total) * 100) : 0}% complete</strong>
          </div>
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="revision-grid">
        {subjectMeta.map((subject) => (
          <section key={subject.key} className="subject-card" id={`subject-${subject.key}`}>
            <div className="subject-card__header">
              <div>
                <h3>{subject.label}</h3>
                <p className="subject-progress-text">
                  {subjectProgress[subject.key].chapterDone}/{subjectProgress[subject.key].chapterTotal} complete
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

            {subject.key === "chemistry" ? (
              <div className="subject-sections">
                {chemistrySectionMeta.map((section) => {
                  const chapters = board.chemistry.filter(
                    (chapter) => getChemistrySectionForChapter(chapter) === section.key
                  );

                  return (
                    <section key={section.key} className="subject-section">
                      <div className="subject-section__header">
                        <h4>{section.label}</h4>
                        <span>{chapters.length} chapters</span>
                      </div>
                      {renderChapterForm("chemistry", section.key)}
                      {renderChapterList("chemistry", chapters, `No chapters added in ${section.label} yet.`)}
                    </section>
                  );
                })}
              </div>
            ) : (
              <>
                {renderChapterForm(subject.key)}
                {renderChapterList(subject.key, board[subject.key])}
              </>
            )}
          </section>
        ))}
      </div>
      </section>

      {deleteTarget ? (
        <ConfirmDeleteModal
          title={`Delete ${deleteTarget.title}?`}
          description={
            deleteTarget.entityType === "chapter"
              ? "Are you sure you want to delete this chapter and all its units, notes, and checklist items? This cannot be undone."
              : "Are you sure you want to delete this unit and all its contents? This cannot be undone."
          }
          confirmLabel={`Delete ${deleteTarget.entityType}`}
          isDeleting={isDeleting}
          onCancel={() => {
            if (!isDeleting) {
              setDeleteTarget(null);
            }
          }}
          onConfirm={deleteEntity}
        />
      ) : null}
    </>
  );
}
