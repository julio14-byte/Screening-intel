"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CloseoutBoard } from "@/components/cierre/CloseoutBoard";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/StateMessage";

function CloseoutInner() {
  const params = useSearchParams();
  const protocolId = params.get("protocol") ?? undefined;
  return <CloseoutBoard initialProtocolId={protocolId ?? undefined} />;
}

export default function CierrePage() {
  return (
    <>
      <PageHeader
        title="Cierre de estudio"
        description="Antes de ver resultados se congela la base. Después se abre el ciego, se arma un snapshot descriptivo, un CSR del centro y se registra el paquete para agencias. Crisvia no sustituye al bioestadístico ni envía a FDA/EMA/COFEPRIS."
      />
      <Suspense fallback={<LoadingState label="Cargando cierre…" />}>
        <CloseoutInner />
      </Suspense>
    </>
  );
}
