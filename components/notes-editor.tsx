"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ScoreModal } from "@/components/score-modal";
import { MockTest } from "@/lib/types";

type NotesEditorProps = {
  date: string;
  initialNotesHtml: string;
  initialMockTests: MockTest[];
};

function testSummary(test: MockTest) {
  return (
    <>
      <span>Total </span>
      <strong className="score-total-value">{test.total}</strong>
      <span> | Physics {test.physics} | Chemistry {test.chemistry} | Zoology {test.zoology} | Botany {test.botany}</span>
    </>
  );
}

export function NotesEditor({ date, initialNotesHtml, initialMockTests }: NotesEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const hasMountedRef = useRef(false);
  const [notesHtml, setNotesHtml] = useState(initialNotesHtml);
  const [mockTests, setMockTests] = useState(initialMockTests);
  const [status, setStatus] = useState("Saved");
  const [error, setError] = useState("");
  const [modalState, setModalState] = useState<{ open: boolean; test: MockTest | null }>({ open: false, test: null });

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    if (editorRef.current.innerHTML !== initialNotesHtml) {
      editorRef.current.innerHTML = initialNotesHtml;
    }
  }, [initialNotesHtml]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    const timeout = window.setTimeout(async () => {
      setStatus("Saving...");
      setError("");

      try {
        const response = await fetch(`/api/day/${date}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ notesHtml, fontScale: "md" })
        });

        const data = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(data.error || "Unable to save notes.");
        }

        setStatus("Saved");
      } catch (saveError) {
        setStatus("Not saved");
        setError(saveError instanceof Error ? saveError.message : "Unable to save notes.");
      }
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [date, notesHtml]);

  const scoreCountText = useMemo(() => {
    return mockTests.length === 1 ? "1 mock test logged" : `${mockTests.length} mock tests logged`;
  }, [mockTests.length]);

  function runCommand(command: "bold" | "italic" | "insertUnorderedList" | "indent" | "outdent") {
    editorRef.current?.focus();
    document.execCommand(command);
    setNotesHtml(editorRef.current?.innerHTML || "");
  }

  function updateEditorHtml() {
    setNotesHtml(editorRef.current?.innerHTML || "");
  }

  return (
    <>
      <section className="day-shell">
        <div className="day-shell__header">
          <div>
            <p className="eyebrow">Daily Notes</p>
            <h2>{scoreCountText}</h2>
          </div>

          <button type="button" className="primary-button" onClick={() => setModalState({ open: true, test: null })}>
            Add score
          </button>
        </div>

        <div className="score-list">
          {mockTests.length ? (
            mockTests.map((test) => (
              <button
                key={test.id}
                type="button"
                className="score-card"
                onClick={() => setModalState({ open: true, test })}
              >
                <div className="score-card__top">
                  <strong>{test.label || "Mock test"}</strong>
                  <span className="score-card__total">{test.total}</span>
                </div>
                <p>{testSummary(test)}</p>
              </button>
            ))
          ) : (
            <div className="empty-card">
              <p>No mock tests logged for this date yet.</p>
            </div>
          )}
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

            <div className="save-indicator" aria-live="polite">
              {status}
            </div>
          </div>

          <div
            ref={editorRef}
            className="notes-editor notes-editor--md"
            contentEditable
            suppressContentEditableWarning
            onInput={updateEditorHtml}
            data-placeholder="Write what happened today, what felt strong, and what needs another revision pass..."
          />

          {error ? <p className="form-error">{error}</p> : null}
        </div>
      </section>

      {modalState.open ? (
        <ScoreModal
          date={date}
          initialValue={modalState.test}
          onClose={() => setModalState({ open: false, test: null })}
          onSaved={(saved) => {
            setMockTests((current) => {
              const next = [...current];
              const index = next.findIndex((item) => item.id === saved.id);

              if (index >= 0) {
                next[index] = saved;
              } else {
                next.push(saved);
              }

              return next.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
            });
          }}
          onDeleted={(testId) => {
            setMockTests((current) => current.filter((test) => test.id !== testId));
          }}
        />
      ) : null}
    </>
  );
}
