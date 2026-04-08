"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { MockTest, MockTestPayload } from "@/lib/types";

type ScoreModalProps = {
  date: string;
  initialValue?: MockTest | null;
  onClose: () => void;
  onSaved: (test: MockTest) => void;
  onDeleted?: (testId: string) => void;
};

type FieldState = {
  label: string;
  physics: string;
  chemistry: string;
  zoology: string;
  botany: string;
};

const emptyState: FieldState = {
  label: "",
  physics: "",
  chemistry: "",
  zoology: "",
  botany: ""
};

const MAX_SUBJECT_MARKS = 180;

export function ScoreModal({ date, initialValue, onClose, onSaved, onDeleted }: ScoreModalProps) {
  const [fields, setFields] = useState<FieldState>(emptyState);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!initialValue) {
      setFields(emptyState);
      return;
    }

    setFields({
      label: initialValue.label || "",
      physics: String(initialValue.physics),
      chemistry: String(initialValue.chemistry),
      zoology: String(initialValue.zoology),
      botany: String(initialValue.botany)
    });
  }, [initialValue]);

  const total = useMemo(() => {
    return ["physics", "chemistry", "zoology", "botany"].reduce((sum, key) => {
      const value = Number(fields[key as keyof Omit<FieldState, "label">]) || 0;
      return sum + value;
    }, 0);
  }, [fields]);

  function updateNumberField(name: keyof Omit<FieldState, "label">, value: string) {
    if (value && !/^\d+$/.test(value)) {
      return;
    }

    if (value && Number(value) > MAX_SUBJECT_MARKS) {
      setError("Each subject mark must be 180 or lower.");
      return;
    }

    setError("");
    setFields((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload: MockTestPayload = {
      id: initialValue?.id,
      date,
      label: fields.label.trim(),
      physics: Number(fields.physics || 0),
      chemistry: Number(fields.chemistry || 0),
      zoology: Number(fields.zoology || 0),
      botany: Number(fields.botany || 0)
    };

    if (payload.label && payload.label.length > 10) {
      setError("Label can be at most 10 characters.");
      return;
    }

    const values = [payload.physics, payload.chemistry, payload.zoology, payload.botany];

    if (values.some((value) => value > MAX_SUBJECT_MARKS)) {
      setError("Each subject mark must be 180 or lower.");
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/mock-tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as { test?: MockTest; error?: string };

      if (!response.ok || !data.test) {
        throw new Error(data.error || "Unable to save the test score.");
      }

      onSaved(data.test);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save the test score.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!initialValue) {
      return;
    }

    const confirmed = window.confirm("Delete this mock test score?");

    if (!confirmed) {
      return;
    }

    setError("");
    setIsDeleting(true);

    try {
      const response = await fetch("/api/mock-tests", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ id: initialValue.id })
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to delete the test score.");
      }

      onDeleted?.(initialValue.id);
      onClose();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete the test score.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="score-modal-title" onClick={(event) => event.stopPropagation()}>
        <div className="modal-card__header">
          <div>
            <p className="eyebrow">Mock Test</p>
            <h2 id="score-modal-title">{initialValue ? "Edit score" : "Add score"}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Mock test name (optional)</span>
            <input
              type="text"
              value={fields.label}
              onChange={(event) => setFields((current) => ({ ...current, label: event.target.value.slice(0, 10) }))}
              placeholder="Morning"
              maxLength={10}
            />
          </label>

          <div className="score-grid">
            <label className="field">
              <span>Physics</span>
              <input type="text" inputMode="numeric" maxLength={3} value={fields.physics} onChange={(event) => updateNumberField("physics", event.target.value)} />
            </label>
            <label className="field">
              <span>Chemistry</span>
              <input type="text" inputMode="numeric" maxLength={3} value={fields.chemistry} onChange={(event) => updateNumberField("chemistry", event.target.value)} />
            </label>
            <label className="field">
              <span>Zoology</span>
              <input type="text" inputMode="numeric" maxLength={3} value={fields.zoology} onChange={(event) => updateNumberField("zoology", event.target.value)} />
            </label>
            <label className="field">
              <span>Botany</span>
              <input type="text" inputMode="numeric" maxLength={3} value={fields.botany} onChange={(event) => updateNumberField("botany", event.target.value)} />
            </label>
          </div>

          <label className="field field--readonly">
            <span>Total</span>
            <input type="text" value={total} readOnly />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="modal-form__actions">
            {initialValue ? (
              <button type="button" className="danger-button" onClick={handleDelete} disabled={isDeleting || isSaving}>
                {isDeleting ? "Deleting..." : "Delete score"}
              </button>
            ) : null}
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={isSaving || isDeleting}>
              {isSaving ? "Saving..." : "Save score"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
