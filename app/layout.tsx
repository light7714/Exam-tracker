import type { ReactNode } from "react";
import type { Metadata } from "next";

import { NavigationBar } from "@/components/navigation-bar";
import { hasAccess } from "@/lib/auth";
import { APP_TIME_ZONE, getCountdownDays } from "@/lib/date-utils";

import "./globals.css";

export const metadata: Metadata = {
  title: "Exam Tracker",
  description: "A study tracker for mock tests, notes, and revision.",
  openGraph: {
    title: "Exam Tracker",
    description: "A study tracker for mock tests, notes, and revision."
  },
  twitter: {
    title: "Exam Tracker",
    description: "A study tracker for mock tests, notes, and revision."
  }
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const allowed = await hasAccess();
  const countdownDays = getCountdownDays(new Date(), APP_TIME_ZONE);

  return (
    <html lang="en">
      <body>
        <div className="page-backdrop" />
        {allowed ? <NavigationBar countdownDays={countdownDays} /> : null}
        <main className={allowed ? "page-shell" : "page-shell page-shell--gate"}>{children}</main>
      </body>
    </html>
  );
}
