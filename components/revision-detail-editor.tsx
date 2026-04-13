"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import {
  REVISION_CHECKLIST_GROUPS,
  RevisionChecklist,
  RevisionChecklistGroup,
  RevisionChecklistItem,
  RevisionDetailEntry,
  RevisionStatus
} from "@/lib/types";

type RevisionDetailEditorProps = {
  detail: RevisionDetailEntry;
};

const statusLabels: Record<RevisionStatus, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  done: "Done"
};

const checklistLabels: Record<RevisionChecklistGroup, string> = {
  weakPoints: "Weak points",
  formulas: "Formulas",
  mistakes: "Mistakes to revise"
};

const checklistPlaceholders: Record<RevisionChecklistGroup, string> = {
  weakPoints: "Add a weak point to revisit",
  formulas: "Add a formula or concept",
  mistakes: "Add a mistake to avoid next time"
};

const subjectLabels = {
  physics: "Physics",
  chemistry: "Chemistry",
  zoology: "Zoology",
  botany: "Botany"
} as const;

function formatRevisionUpdatedAt(value: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata"
  }).formatToParts(new Date(value));

  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const year = parts.find((part) => part.type === "year")?.value;
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;
  const dayPeriod = parts.find((part) => part.type === "dayPeriod")?.value?.toLowerCase();

  if (!day || !month || !year || !hour || !minute || !dayPeriod) {
    return value;
  }

  return `${day} ${month} ${year}, ${hour}:${minute} ${dayPeriod}`;
}

function normalizeNotesHtml(html: string) {
  const trimmed = html.trim();
  const textContent = trimmed.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
  return textContent ? trimmed : "";
}

function normalizeChecklistForSave(checklist: RevisionChecklist): RevisionChecklist {
  return Object.fromEntries(
    REVISION_CHECKLIST_GROUPS.map((group) => [
      group,
      checklist[group].map((item) => ({
        id: item.id,
        text: item.text.trim(),
        checked: item.checked
      })).filter((item) => item.text)
    ])
  ) as RevisionChecklist;
}

function checklistSnapshot(checklist: RevisionChecklist) {
  return JSON.stringify(normalizeChecklistForSave(checklist));
}

export function RevisionDetailEditor({ detail }: RevisionDetailEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const hasMountedRef = useRef(false);
  const savedSnapshotRef = useRef({
    notesHtml: normalizeNotesHtml(detail.notesHtml),
    checklist: checklistSnapshot(detail.checklist)
  });
  const [notesHtml, setNotesHtml] = useState(detail.notesHtml);
  const [checklist, setChecklist] = useState<RevisionChecklist>(detail.checklist);
  const [checklistDrafts, setChecklistDrafts] = useState<Record<RevisionChecklistGroup, string>>({
    weakPoints: "",
    formulas: "",
    mistakes: ""
  });
  const [saveState, setSaveState] = useState("Saved");
  const [updatedAt, setUpdatedAt] = useState(detail.updatedAt);
  const [error, setError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const backHref = `/revision#subject-${detail.subject}`;
  const entityLabel = detail.entityType === "chapter" ? "Chapter" : "Unit";

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    if (editorRef.current.innerHTML !== detail.notesHtml) {
      editorRef.current.innerHTML = detail.notesHtml;
    }
  }, [detail.notesHtml]);

  useEffect(() => {
    savedSnapshotRef.current = {
      notesHtml: normalizeNotesHtml(detail.notesHtml),
      checklist: checklistSnapshot(detail.checklist)
    };
    setUpdatedAt(detail.updatedAt);
  }, [detail.checklist, detail.notesHtml, detail.updatedAt]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    const timeout = window.setTimeout(async () => {
      const normalizedNotesHtml = normalizeNotesHtml(notesHtml);
      const normalizedChecklist = normalizeChecklistForSave(checklist);
      const nextSnapshot = {
        notesHtml: normalizedNotesHtml,
        checklist: JSON.stringify(normalizedChecklist)
      };

      if (
        nextSnapshot.notesHtml === savedSnapshotRef.current.notesHtml &&
        nextSnapshot.checklist === savedSnapshotRef.current.checklist
      ) {
        setSaveState("Saved");
        return;
      }

      setSaveState("Saving...");
      setError("");

      try {
        const response = await fetch(`/api/revision/details/${detail.entityType}/${detail.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ notesHtml: normalizedNotesHtml, checklist: normalizedChecklist })
        });

        const data = (await response.json()) as { updatedAt?: string; error?: string };

        if (!response.ok) {
          throw new Error(data.error || "Unable to save notes.");
        }

        savedSnapshotRef.current = nextSnapshot;
        setUpdatedAt(data.updatedAt);
        setSaveState("Saved");
      } catch (saveError) {
        setSaveState("Not saved");
        setError(saveError instanceof Error ? saveError.message : "Unable to save notes.");
      }
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [checklist, detail.entityType, detail.id, notesHtml]);

  const formattedUpdatedAt = useMemo(() => {
    if (!updatedAt) {
      return "Not saved yet";
    }

    return formatRevisionUpdatedAt(updatedAt);
  }, [updatedAt]);

  function runCommand(command: "bold" | "italic" | "insertUnorderedList" | "indent" | "outdent") {
    editorRef.current?.focus();
    document.execCommand(command);
    setNotesHtml(editorRef.current?.innerHTML || "");
  }

  function updateEditorHtml() {
    setNotesHtml(editorRef.current?.innerHTML || "");
  }

  function addChecklistItem(group: RevisionChecklistGroup) {
    const text = checklistDrafts[group].trim();

    if (!text) {
      return;
    }

    setChecklist((current) => ({
      ...current,
      [group]: [
        ...current[group],
        {
          id: crypto.randomUUID(),
          text,
          checked: false
        }
      ]
    }));
    setChecklistDrafts((current) => ({ ...current, [group]: "" }));
  }

  function updateChecklistItem(
    group: RevisionChecklistGroup,
    itemId: string,
    payload: Partial<Pick<RevisionChecklistItem, "text" | "checked">>
  ) {
    setChecklist((current) => ({
      ...current,
      [group]: current[group].map((item) => (item.id === itemId ? { ...item, ...payload } : item))
    }));
  }

  function removeChecklistItem(group: RevisionChecklistGroup, itemId: string) {
    setChecklist((current) => ({
      ...current,
      [group]: current[group].filter((item) => item.id !== itemId)
    }));
  }

  async function deleteEntity() {
    setIsDeleting(true);
    setError("");

    try {
      const endpoint = detail.entityType === "chapter" ? "/api/revision/chapters" : "/api/revision/units";
      const response = await fetch(`${endpoint}?id=${detail.id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || `Unable to delete ${detail.entityType}.`);
      }

      window.location.assign(backHref);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : `Unable to delete ${detail.entityType}.`);
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  }

  return (
    <>
      <section className="revision-detail-shell">
        <a href={backHref} className="back-link secondary-button revision-detail-back">
          Back to revision board
        </a>

        <div className="revision-detail-header">
          <div className="revision-detail-copy">
            <p className="eyebrow">
              {subjectLabels[detail.subject]} / {entityLabel}
            </p>
            <h2>{detail.title}</h2>
            {detail.chapterTitle && detail.chapterId ? (
              <p className="revision-detail-parent">
                Inside chapter{" "}
                <Link href={`/revision/${detail.subject}/chapter/${detail.chapterId}` as never} className="inline-link">
                  {detail.chapterTitle}
                </Link>
              </p>
            ) : null}
          </div>

          <div className="revision-detail-actions">
            <span className={`status-badge status-badge--${detail.status}`}>{statusLabels[detail.status]}</span>
            <button type="button" className="danger-button" onClick={() => setShowDeleteModal(true)}>
              Delete {entityLabel.toLowerCase()}
            </button>
          </div>
        </div>

        <div className="revision-detail-meta">
          <span>Last updated: {formattedUpdatedAt}</span>
          <span>{saveState}</span>
        </div>

        <div className="notes-card">
          <div className="notes-toolbar">
            <div className="toolbar-group">
              <button type="button" className="toolbar-button" onClick={() => runCommand("bold")}>
                Bold
              </button>
              <button type="button" className="toolbar-button toolbar-button--italic" onClick={() => runCommand("italic")}>
                Italic
              </button>
              <button type="button" className="toolbar-button" onClick={() => runCommand("insertUnorderedList")}>
                Bullets
              </button>
              <button type="button" className="toolbar-button" onClick={() => runCommand("indent")}>
                Indent
              </button>
              <button type="button" className="toolbar-button" onClick={() => runCommand("outdent")}>
                Outdent
              </button>
            </div>
          </div>

          <div
            ref={editorRef}
            className="notes-editor notes-editor--md"
            contentEditable
            suppressContentEditableWarning
            onInput={updateEditorHtml}
            data-placeholder={`Write notes for this ${detail.entityType}, what feels shaky, and what you want to revisit next...`}
          />
        </div>

        <section className="revision-checklist-card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Checklist</p>
              <h2>Weak points, formulas, and mistakes</h2>
            </div>
          </div>

          <div className="revision-checklist-grid">
            {REVISION_CHECKLIST_GROUPS.map((group) => (
              <div key={group} className="checklist-group">
                <div className="checklist-group__header">
                  <h3>{checklistLabels[group]}</h3>
                  <span>{checklist[group].length}</span>
                </div>

                <div className="checklist-add">
                  <input
                    type="text"
                    value={checklistDrafts[group]}
                    onChange={(event) => setChecklistDrafts((current) => ({ ...current, [group]: event.target.value }))}
                    placeholder={checklistPlaceholders[group]}
                  />
                  <button type="button" className="secondary-button" onClick={() => addChecklistItem(group)}>
                    Add
                  </button>
                </div>

                <div className="checklist-items">
                  {checklist[group].length ? (
                    checklist[group].map((item) => (
                      <div key={item.id} className="checklist-item">
                        <label className="checklist-checkbox">
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={(event) => updateChecklistItem(group, item.id, { checked: event.target.checked })}
                          />
                          <span />
                        </label>
                        <input
                          type="text"
                          value={item.text}
                          onChange={(event) => updateChecklistItem(group, item.id, { text: event.target.value })}
                          className="editable-input editable-input--unit"
                        />
                        <button
                          type="button"
                          className="danger-button danger-button--compact"
                          onClick={() => removeChecklistItem(group, item.id)}
                        >
                          Delete
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="empty-card">
                      <p>No items added here yet.</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {error ? <p className="form-error">{error}</p> : null}
      </section>

      {showDeleteModal ? (
        <ConfirmDeleteModal
          title={`Delete this ${entityLabel.toLowerCase()}?`}
          description={
            detail.entityType === "chapter"
              ? "Are you sure you want to delete this chapter and all its units, notes, and checklist items? This cannot be undone."
              : "Are you sure you want to delete this unit and all its notes and checklist items? This cannot be undone."
          }
          confirmLabel={`Delete ${entityLabel.toLowerCase()}`}
          isDeleting={isDeleting}
          onCancel={() => {
            if (!isDeleting) {
              setShowDeleteModal(false);
            }
          }}
          onConfirm={deleteEntity}
        />
      ) : null}
    </>
  );
}
