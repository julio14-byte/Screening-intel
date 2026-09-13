"use client";

import { PendingQueue } from "@/components/queue/PendingQueue";
import { PageHeader } from "@/components/ui/PageHeader";

export default function PendientesPage() {
  return (
    <>
      <PageHeader
        title="Pendientes"
        description="Cola operativa: visitas vencidas, ICF faltante y criterios 🟡 (labs o datos que el matching no pudo evaluar)."
      />
      <PendingQueue />
    </>
  );
}
