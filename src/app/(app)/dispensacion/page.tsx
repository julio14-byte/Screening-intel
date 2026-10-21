import { DispenseBoard } from "@/components/pharmacy/DispenseBoard";
import { PageHeader } from "@/components/ui/PageHeader";

export default function DispensacionPage() {
  return (
    <>
      <PageHeader
        title="Dispensación"
        description="Fecha de entrega del medicamento del estudio, para pacientes que ya están randomizados. No hay lotes ni stock."
      />
      <DispenseBoard />
    </>
  );
}
