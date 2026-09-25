"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export function ProtocolCloseoutPanel({ protocolId }: { protocolId: string }) {
  return (
    <Card className="mb-4">
      <CardHeader
        title="Cierre de estudio"
        description="Limpieza del monitor, Database Lock, apertura del ciego, snapshot descriptivo, CSR del centro y registro regulatorio. No es envío a FDA/EMA/COFEPRIS ni SAS/R."
        actions={<Lock className="h-4 w-4 text-slate-500" aria-hidden />}
      />
      <CardBody>
        <Link
          href={`/cierre?protocol=${protocolId}`}
          className="text-sm font-medium text-violet-700 hover:underline"
        >
          Abrir pipeline de cierre
        </Link>
      </CardBody>
    </Card>
  );
}
