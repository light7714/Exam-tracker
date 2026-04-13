function SkeletonBlock({ className = "" }: { className?: string }) {
  return <span className={`skeleton-block ${className}`.trim()} aria-hidden="true" />;
}

export function CalendarPageSkeleton() {
  return (
    <section className="calendar-shell loading-card">
      <div className="panel-heading">
        <div className="loading-stack">
          <SkeletonBlock className="skeleton-text skeleton-text--eyebrow" />
          <SkeletonBlock className="skeleton-text skeleton-text--title" />
        </div>

        <div className="loading-inline">
          <SkeletonBlock className="skeleton-chip" />
          <SkeletonBlock className="skeleton-icon" />
          <SkeletonBlock className="skeleton-icon" />
        </div>
      </div>

      <div className="calendar-board">
        <div className="calendar-grid calendar-grid--weekday" aria-hidden="true">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="weekday-cell">
              <SkeletonBlock className="skeleton-text skeleton-text--weekday" />
            </div>
          ))}
        </div>

        <div className="calendar-grid">
          {Array.from({ length: 14 }).map((_, index) => (
            <div key={index} className="calendar-cell calendar-cell--loading">
              <div className="calendar-cell__header">
                <SkeletonBlock className="skeleton-date" />
                <SkeletonBlock className="skeleton-chip skeleton-chip--small" />
              </div>
              <div className="calendar-cell__content">
                <SkeletonBlock className="skeleton-score" />
                <SkeletonBlock className="skeleton-score skeleton-score--short" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DayPageSkeleton() {
  return (
    <section className="day-page">
      <div className="day-page__header">
        <div className="loading-stack">
          <SkeletonBlock className="skeleton-chip skeleton-chip--nav" />
          <SkeletonBlock className="skeleton-text skeleton-text--eyebrow" />
          <SkeletonBlock className="skeleton-text skeleton-text--title" />
        </div>
      </div>

      <section className="day-shell loading-card">
        <div className="day-shell__header">
          <div className="loading-stack">
            <SkeletonBlock className="skeleton-text skeleton-text--eyebrow" />
            <SkeletonBlock className="skeleton-text skeleton-text--subtitle" />
          </div>
          <SkeletonBlock className="skeleton-chip" />
        </div>

        <div className="score-list">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="score-card">
              <div className="score-card__top">
                <SkeletonBlock className="skeleton-text skeleton-text--card-title" />
                <SkeletonBlock className="skeleton-text skeleton-text--number" />
              </div>
              <SkeletonBlock className="skeleton-text skeleton-text--body" />
            </div>
          ))}
        </div>

        <div className="notes-card">
          <div className="notes-toolbar">
            <div className="toolbar-group">
              {Array.from({ length: 5 }).map((_, index) => (
                <SkeletonBlock key={index} className="skeleton-chip skeleton-chip--toolbar" />
              ))}
            </div>
            <SkeletonBlock className="skeleton-text skeleton-text--tiny" />
          </div>

          <div className="notes-editor loading-editor">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonBlock
                key={index}
                className={`skeleton-text skeleton-text--body ${index === 4 ? "skeleton-text--body-short" : ""}`}
              />
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}

export function RevisionBoardSkeleton() {
  return (
    <section className="revision-shell loading-card">
      <div className="panel-heading">
        <div className="loading-stack">
          <SkeletonBlock className="skeleton-text skeleton-text--eyebrow" />
          <SkeletonBlock className="skeleton-text skeleton-text--title" />
        </div>

        <div className="revision-top-actions">
          <SkeletonBlock className="skeleton-chip skeleton-chip--nav" />
          <SkeletonBlock className="skeleton-chip" />
        </div>
      </div>

      <div className="revision-grid">
        {Array.from({ length: 2 }).map((_, index) => (
          <section key={index} className="subject-card loading-card">
            <div className="subject-card__header">
              <div className="loading-stack">
                <SkeletonBlock className="skeleton-text skeleton-text--subtitle" />
                <SkeletonBlock className="skeleton-text skeleton-text--tiny" />
              </div>
              <div className="subject-summary">
                <SkeletonBlock className="skeleton-chip skeleton-chip--small" />
                <SkeletonBlock className="skeleton-chip skeleton-chip--small" />
              </div>
            </div>

            <div className="subject-progress-bar" aria-hidden="true">
              <span style={{ width: "42%" }} />
            </div>

            <div className="inline-form">
              <SkeletonBlock className="skeleton-input" />
              <SkeletonBlock className="skeleton-chip" />
            </div>

            <div className="chapter-list">
              <div className="chapter-card">
                <div className="chapter-card__row">
                  <div className="entity-main-row">
                    <SkeletonBlock className="skeleton-input" />
                    <SkeletonBlock className="skeleton-icon" />
                  </div>
                  <div className="status-action-row">
                    <SkeletonBlock className="skeleton-select" />
                    <SkeletonBlock className="skeleton-delete" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

export function RevisionDetailSkeleton() {
  return (
    <section className="revision-detail-shell loading-card">
      <SkeletonBlock className="skeleton-chip skeleton-chip--nav" />

      <div className="revision-detail-header">
        <div className="loading-stack">
          <SkeletonBlock className="skeleton-text skeleton-text--eyebrow" />
          <SkeletonBlock className="skeleton-text skeleton-text--hero" />
          <SkeletonBlock className="skeleton-text skeleton-text--tiny" />
        </div>

        <div className="revision-detail-actions">
          <SkeletonBlock className="skeleton-chip skeleton-chip--small" />
          <SkeletonBlock className="skeleton-chip" />
        </div>
      </div>

      <div className="revision-detail-meta">
        <SkeletonBlock className="skeleton-text skeleton-text--tiny" />
        <SkeletonBlock className="skeleton-text skeleton-text--tiny" />
      </div>

      <div className="notes-card">
        <div className="notes-toolbar">
          <div className="toolbar-group">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonBlock key={index} className="skeleton-chip skeleton-chip--toolbar" />
            ))}
          </div>
        </div>

        <div className="notes-editor loading-editor">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonBlock
              key={index}
              className={`skeleton-text skeleton-text--body ${index === 5 ? "skeleton-text--body-short" : ""}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
