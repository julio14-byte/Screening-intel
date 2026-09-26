"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

const COPY = {
  edc: {
    title: "EDC lo opera un tercero",
    hint: "Captura clínica del estudio (visitas, CRF). El sujeto vive en el EDC cuando el screening queda elegible.",
    body: "Crisvia ya no captura visitas, farmacia ni cierre. El EDC del estudio (Castor, Medidata, Rave, un EDC del sponsor, etc.) es donde corre el estudio.",
  },
  epro: {
    title: "ePRO lo opera un tercero",
    hint: "Cuestionarios del paciente. El ePRO del estudio invita al sujeto; Crisvia no hospeda /epro-app.",
    body: "Crisvia no invita al paciente ni hospeda el diario. El ePRO del estudio es el de ese protocolo.",
  },
  iwrs: {
    title: "IWRS lo opera un tercero",
    hint: "Randomización y kit. El IRT del sponsor es la fuente de verdad.",
    body: "Crisvia no sortea kit. El coordinador marca Randomizado en el tracker cuando el IRT ya asignó kit. No hay enchufe a Lilly.",
  },
} as const;

export type RetiredThirdPartyKind = keyof typeof COPY;

export function RetiredThirdPartyModule({
  kind,
}: {
  kind: RetiredThirdPartyKind;
}) {
  const copy = COPY[kind];
  return (
    <>
      <PageHeader title={copy.title} description={copy.hint} />
      <Card>
        <CardHeader title="No es un módulo de Crisvia" description={copy.body} />
        <CardBody>
          <p className="text-sm text-slate-600">
            Screening sigue en esta app (registro, perfil, matcher, tracker y re-match).
            EDC, ePRO e IWRS quedan en el tercero del estudio. No hay módulo de
            conectores ni enchufe certificado a Lilly, Medidata o IQVIA.
          </p>
        </CardBody>
      </Card>
    </>
  );
}
