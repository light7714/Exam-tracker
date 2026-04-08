"use client";

import type { Route } from "next";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ScoreModal } from "@/components/score-modal";
import { createMonthGrid, formatMonthLabel, formatDateString, monthKeyFromDate, shiftMonth } from "@/lib/date-utils";
import { DaySummary, MockTest } from "@/lib/types";

type CalendarClientProps = {
  initialMonth: string;
  initialSummaries: DaySummary[];
  todayString: string;
};

function summariseTest(test: MockTest) {
  return (
    <>
      <span>Total: </span>
      <strong className="score-total-value">{test.total}</strong>
      <span>, P: {test.physics}, C: {test.chemistry}, Z: {test.zoology}, B: {test.botany}</span>
    </>
  );
}

export function CalendarClient({ initialMonth, initialSummaries, todayString }: CalendarClientProps) {
  const router = useRouter();
  const [month, setMonth] = useState(initialMonth);
  const [summaries, setSummaries] = useState<Record<string, DaySummary>>(
    Object.fromEntries(initialSummaries.map((item) => [item.date, item]))
  );
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [editingTest, setEditingTest] = useState<MockTest | null>(null);
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);
  const maxVisibleTests = 2;

  const weeks = useMemo(() => createMonthGrid(month), [month]);

  async function loadMonth(nextMonth: string) {
    setIsLoadingMonth(true);

    try {
      const response = await fetch(`/api/month?month=${nextMonth}`, { cache: "no-store" });
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as { summaries: DaySummary[] };
      setMonth(nextMonth);
      setSummaries(Object.fromEntries(data.summaries.map((item) => [item.date, item])));
    } finally {
      setIsLoadingMonth(false);
    }
  }

  function handleSavedTest(test: MockTest) {
    setSummaries((current) => {
      const existing = current[test.date];
      const nextTests = [...(existing?.mockTests || [])];
      const index = nextTests.findIndex((item) => item.id === test.id);

      if (index >= 0) {
        nextTests[index] = test;
      } else {
        nextTests.push(test);
      }

      return {
        ...current,
        [test.date]: {
          date: test.date,
          mockTests: nextTests.sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
          notesUpdatedAt: existing?.notesUpdatedAt
        }
      };
    });
  }

  function handleDeletedTest(testId: string) {
    setSummaries((current) => {
      const nextEntries = Object.entries(current).map(([date, summary]) => {
        const nextTests = summary.mockTests.filter((test) => test.id !== testId);

        return [
          date,
          {
            ...summary,
            mockTests: nextTests
          }
        ] satisfies [string, DaySummary];
      });

      return Object.fromEntries(nextEntries);
    });
  }

  return (
    <>
      <section className="calendar-shell">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Main Planner</p>
            <h2>{formatMonthLabel(month)}</h2>
          </div>

          <div className="calendar-controls">
            <button type="button" className="secondary-button" onClick={() => loadMonth(monthKeyFromDate(new Date()))}>
              Today
            </button>
            <div className="calendar-stepper">
              <button type="button" className="icon-button" aria-label="Previous month" onClick={() => loadMonth(shiftMonth(month, -1))}>
                ‹
              </button>
              <button type="button" className="icon-button" aria-label="Next month" onClick={() => loadMonth(shiftMonth(month, 1))}>
                ›
              </button>
            </div>
          </div>
        </div>

        <div className="calendar-board">
          <div className="calendar-grid calendar-grid--weekday" aria-hidden="true">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="weekday-cell">
                {day}
              </div>
            ))}
          </div>

          <div className={isLoadingMonth ? "calendar-grid calendar-grid--loading" : "calendar-grid"}>
            {weeks.flat().map((date) => {
              const dateString = formatDateString(date);
              const target = `/calendar/${dateString}` as Route;
              const summary = summaries[dateString];
              const isCurrentMonth = dateString.startsWith(month);
              const allTests = summary?.mockTests || [];
              const visibleTests = [...allTests]
                .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
                .slice(0, maxVisibleTests);
              const hiddenCount = Math.max(0, allTests.length - visibleTests.length);

              return (
                <article
                  key={dateString}
                  className={dateString === todayString ? "calendar-cell calendar-cell--today" : "calendar-cell"}
                  data-muted={!isCurrentMonth || undefined}
                  tabIndex={0}
                  onClick={() => router.push(target)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(target);
                    }
                  }}
                >
                  <div className="calendar-cell__header">
                    <span className="calendar-cell__date">{date.getDate()}</span>
                    <button
                      type="button"
                      className="add-score-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingTest(null);
                        setModalDate(dateString);
                      }}
                    >
                      + Score
                    </button>
                  </div>

                  <div className="calendar-cell__content">
                    {visibleTests.map((test) => (
                      <button
                        key={test.id}
                        type="button"
                        className="score-pill"
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditingTest(test);
                          setModalDate(dateString);
                        }}
                        title={
                          test.label
                            ? `${test.label} · Total: ${test.total}, P: ${test.physics}, C: ${test.chemistry}, Z: ${test.zoology}, B: ${test.botany}`
                            : `Total: ${test.total}, P: ${test.physics}, C: ${test.chemistry}, Z: ${test.zoology}, B: ${test.botany}`
                        }
                      >
                        <span className="score-pill__main">{summariseTest(test)}</span>
                        {test.label ? <span className="score-pill__label">{test.label}</span> : null}
                      </button>
                    ))}
                  </div>

                  <p className={hiddenCount > 0 ? "calendar-cell__more calendar-cell__more--visible" : "calendar-cell__more"}>
                    {hiddenCount > 0 ? `+${hiddenCount} more` : ""}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {modalDate ? (
        <ScoreModal
          date={modalDate}
          initialValue={editingTest}
          onClose={() => {
            setModalDate(null);
            setEditingTest(null);
          }}
          onSaved={handleSavedTest}
          onDeleted={handleDeletedTest}
        />
      ) : null}
    </>
  );
}
