"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links: Array<{ href: Route; label: string }> = [
  { href: "/calendar", label: "Calendar" },
  { href: "/revision", label: "Revision" }
];

export function NavigationBar({ countdownDays }: { countdownDays: number }) {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/calendar" className="brand-mark">
          <span className="brand-mark__accent" />
          <div>
            <p className="eyebrow">NEET Journey</p>
            <h1>Exam Tracker</h1>
          </div>
        </Link>

        <nav className="main-nav" aria-label="Primary">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link key={link.href} href={link.href} className={active ? "nav-link nav-link--active" : "nav-link"}>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="countdown-pill">
          <span className="countdown-pill__label">NEET 2026</span>
          <strong>{countdownDays} days left</strong>
        </div>
      </div>
    </header>
  );
}
