import { PageHeader } from "@/components/ui/PageHeader";
import { FollowUpBoard } from "@/components/follow-up/FollowUpBoard";

export default function SeguimientoPage() {
  return (
    <>
      <PageHeader
        title="Seguimiento"
        description="Visitas obligatorias del protocolo con ventana de tiempo, adherencia, signos vitales y viáticos. No reemplaza la agenda de consultas."
      />
      <FollowUpBoard />
    </>
  );
}
