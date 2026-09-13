"use client";

import { VisitCalendar } from "@/components/visits/VisitCalendar";
import { PageHeader } from "@/components/ui/PageHeader";

export default function AgendaPage() {
  return (
    <>
      <PageHeader
        title="Agenda de visitas"
        description="Programa pre-screening, consentimiento, labs, screening y randomización. El monitor puede ver; no edita."
      />
      <VisitCalendar />
    </>
  );
}
