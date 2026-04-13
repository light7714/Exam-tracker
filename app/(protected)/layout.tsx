import type { ReactNode } from "react";

import { NavigationBar } from "@/components/navigation-bar";
import { APP_TIME_ZONE, getCountdownDays } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

export default function ProtectedLayout({ children }: Readonly<{ children: ReactNode }>) {
  const countdownDays = getCountdownDays(new Date(), APP_TIME_ZONE);

  return (
    <>
      <NavigationBar countdownDays={countdownDays} />
      <main className="page-shell">{children}</main>
    </>
  );
}
