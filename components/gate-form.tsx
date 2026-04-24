"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function GateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/entry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name })
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "The name did not match.");
      }

      router.replace("/calendar");
      router.refresh();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="gate-card" onSubmit={handleSubmit}>
      <p className="eyebrow">Private Entrance</p>
      <h1>NEET mock test scores and revision tracker</h1>
      <p className="gate-card__copy">What is your specific Binomial Nomenclature?</p>

      <label className="field">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Genus: Human, Species: [Enter Your Name Here]."
          autoComplete="off"
          spellCheck={false}
          required
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <button type="submit" className="primary-button" disabled={isSubmitting}>
        {isSubmitting ? "Opening..." : "Open tracker"}
      </button>

      <p className="gate-card__footer-copy">
        Log mock scores, write a note for each day, and keep revision progress visible without making the routine feel heavy.
      </p>
    </form>
  );
}
