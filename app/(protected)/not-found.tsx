import Link from "next/link";

export default function ProtectedNotFound() {
  return (
    <section className="not-found-shell">
      <div className="not-found-card">
        <p className="eyebrow">404</p>
        <h1>Wrong turn.</h1>
        <p className="not-found-copy">This page ran away like my focus whenever I think about you.</p>
        <Link href="/calendar" className="primary-button not-found-button">
          Go back to tracker
        </Link>
      </div>
    </section>
  );
}
