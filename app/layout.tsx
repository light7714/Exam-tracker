import type { ReactNode } from "react";
import type { Metadata } from "next";

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
  return (
    <html lang="en">
      <body>
        <div className="page-backdrop" />
        {children}
      </body>
    </html>
  );
}
