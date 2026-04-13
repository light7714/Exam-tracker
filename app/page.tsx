import { redirect } from "next/navigation";

import { GateForm } from "@/components/gate-form";
import { hasAccess } from "@/lib/auth";

export default async function HomePage() {
  if (await hasAccess()) {
    redirect("/calendar");
  }

  return (
    <main className="page-shell page-shell--gate">
      <section className="gate-layout">
        <GateForm />
      </section>
    </main>
  );
}
