"use client";

import Link from "next/link";
import { Plug } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export function ProtocolIntegrationsPanel({ protocolId }: { protocolId: string }) {
  return (
    <Card className="mb-4">
      <CardHeader
        title="EDC, ePRO e IWRS de terceros"
        description="Este protocolo no usa módulos de captura, cuestionario ni randomización de Crisvia. Se conectan afuera."
        actions={<Plug className="h-4 w-4 text-slate-500" aria-hidden />}
      />
      <CardBody>
        <Link
          href={`/integraciones?protocol=${protocolId}`}
          className="text-sm font-medium text-violet-700 hover:underline"
        >
          Configurar webhooks
        </Link>
      </CardBody>
    </Card>
  );
}
