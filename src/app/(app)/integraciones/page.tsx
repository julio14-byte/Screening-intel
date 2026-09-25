"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { IntegrationsBoard } from "@/components/integraciones/IntegrationsBoard";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/StateMessage";

function Inner() {
  const params = useSearchParams();
  return <IntegrationsBoard initialProtocolId={params.get("protocol") ?? undefined} />;
}

export default function IntegracionesPage() {
  return (
    <>
      <PageHeader
        title="Integraciones"
        description="Crisvia hace screening. EDC, ePRO e IWRS los opera un tercero y se conectan por webhook firmado. No hay API pública de Lilly ni de Medidata."
      />
      <Suspense fallback={<LoadingState label="Cargando…" />}>
        <Inner />
      </Suspense>
    </>
  );
}
