import { VisitAgenda } from "@/components/ops/VisitAgenda";
import { PageHeader } from "@/components/ui/PageHeader";

export default function AgendaPage() {
  return (
    <>
      <PageHeader
        title="Agenda de visitas"
        description="Control de visitas del paciente con el médico. Cada consulta queda registrada con nota clínica."
      />
      <VisitAgenda />
    </>
  );
}
