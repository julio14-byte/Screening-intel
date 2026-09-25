import { VisitAgenda } from "@/components/ops/VisitAgenda";
import { PageHeader } from "@/components/ui/PageHeader";

export default function AgendaPage() {
  return (
    <>
      <PageHeader
        title="Agenda de visitas"
        description="Agenda de consultas del centro. Las visitas obligatorias del protocolo (ventana, adherencia) están en Seguimiento."
      />
      <VisitAgenda />
    </>
  );
}
