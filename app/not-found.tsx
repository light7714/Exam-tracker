import Link from "next/link";

export default function NotFound() {
  return (
    <section className="not-found-shell">
      <div className="not-found-card">
        <p className="eyebrow">404</p>
        <h1>Wrong turn.</h1>
        <p className="not-found-copy">This page ran away like my focus whenever I think about you.</p>
        <Link href="/" className="primary-button not-found-button">
          Go back home
        </Link>
      </div>
    </section>
  );
}
