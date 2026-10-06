import { DispenseBoard } from "@/components/pharmacy/DispenseBoard";
import { PageHeader } from "@/components/ui/PageHeader";

export default function DispensacionPage() {
  return (
    <>
      <PageHeader
        title="Dispensación y primera dosis"
        description="Entrega del medicamento del estudio a pacientes randomizados: eliges lote, registras la primera dosis y el inventario se descuenta solo."
      />
      <DispenseBoard />
    </>
  );
}
