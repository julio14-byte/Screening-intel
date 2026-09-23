import { VisitAgenda } from "@/components/ops/VisitAgenda";
import { PageHeader } from "@/components/ui/PageHeader";

export default function AgendaPage() {
  return (
    <>
      <PageHeader
        title="Agenda"
        description="Visitas de pre-screening. Fecha, sede y si la persona asistió."
      />
      <VisitAgenda />
    </>
  );
}
