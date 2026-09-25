import { DispenseBoard } from "@/components/pharmacy/DispenseBoard";
import { PageHeader } from "@/components/ui/PageHeader";

export default function DispensacionPage() {
  return (
    <>
      <PageHeader
        title="Dispensación y primera dosis"
        description="Farmacia entrega la caja IWRS, registra la primera dosis y genera el diario de toma. No es una app aparte ni un eSource tipo Clinical Ink."
      />
      <DispenseBoard />
    </>
  );
}
