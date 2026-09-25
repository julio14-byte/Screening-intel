"use client";

import Link from "next/link";
import { Plug } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { INTEGRATION_KIND_HINT, type IntegrationKind } from "@/lib/integraciones/model";

const COPY: Record<
  IntegrationKind,
  { title: string; body: string }
> = {
  edc: {
    title: "EDC lo opera un tercero",
    body: "Crisvia ya no captura visitas, farmacia ni cierre. El EDC del estudio (Castor, Medidata, Rave, un EDC del sponsor, etc.) recibe al sujeto cuando el screening queda elegible.",
  },
  epro: {
    title: "ePRO lo opera un tercero",
    body: "Crisvia no invita al paciente ni hospeda /epro-app. El ePRO del estudio recibe el alta por webhook.",
  },
  iwrs: {
    title: "IWRS lo opera un tercero",
    body: "Crisvia no sortea kit. El IRT del sponsor (IQVIA, Suvoda, etc.) es la fuente de verdad y avisa a Crisvia cuando randomizó. No hay enchufe a Lilly.",
  },
};

export function RetiredThirdPartyModule({
  kind,
}: {
  kind: IntegrationKind;
}) {
  const copy = COPY[kind];
  return (
    <>
      <PageHeader title={copy.title} description={INTEGRATION_KIND_HINT[kind]} />
      <Card>
        <CardHeader
          title="Conectalo desde Integraciones"
          description={copy.body}
          actions={<Plug className="h-4 w-4 text-slate-500" aria-hidden />}
        />
        <CardBody>
          <p className="text-sm text-slate-600">
            Screening sigue en esta app. EDC, ePRO e IWRS se conectan con un webhook HTTPS
            firmado (HMAC). Hace falta contrato y credenciales de ese estudio; no los inventamos.
          </p>
          <Link
            href="/integraciones"
            className="mt-3 inline-block text-sm font-medium text-violet-700 hover:underline"
          >
            Abrir Integraciones
          </Link>
        </CardBody>
      </Card>
    </>
  );
}
