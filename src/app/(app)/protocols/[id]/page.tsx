"use client";

import Link from "next/link";
import { use } from "react";
import { ArrowLeft, Target } from "lucide-react";
import { ProtocolStudyMedsPanel } from "@/components/pharmacy/ProtocolStudyMedsPanel";
import { ProtocolIwrsPanel } from "@/components/iwrs/ProtocolIwrsPanel";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorState, LoadingState } from "@/components/ui/StateMessage";
import { useProtocols } from "@/hooks/useProtocols";

export default function ProtocolPharmacyPage({
  params,
}: PageProps<"/protocols/[id]">) {
  const { id } = use(params);
  const { protocols, loading, error } = useProtocols();
  const protocol = protocols.find((item) => item.id === id);

  if (loading) return <LoadingState label="Cargando protocolo…" />;
  if (error || !protocol)
    return <ErrorState message={error ?? "Protocolo no encontrado"} />;

  return (
    <>
      <Link
        href="/protocols"
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Volver a protocolos
      </Link>

      <PageHeader
        title={`${protocol.code_name} · lotes e IWRS`}
        description={`${protocol.title}. Medicamento del estudio e IWRS (kit/brazo) después del screening.`}
        actions={
          <Link href={`/protocols/${protocol.id}/match`}>
            <Button variant="secondary">
              <Target className="h-4 w-4" aria-hidden />
              Matching
            </Button>
          </Link>
        }
      />

      <ProtocolStudyMedsPanel protocolId={protocol.id} />
      <ProtocolIwrsPanel protocolId={protocol.id} />
    </>
  );
}
