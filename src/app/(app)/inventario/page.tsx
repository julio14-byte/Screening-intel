import { InventoryBoard } from "@/components/pharmacy/InventoryBoard";
import { PageHeader } from "@/components/ui/PageHeader";

export default function InventarioPage() {
  return (
    <>
      <PageHeader
        title="Inventario de medicamentos"
        description="Lotes de la farmacéutica por protocolo: recepción, existencias y caducidad. La entrega y la primera dosis se registran en Dispensación."
      />
      <InventoryBoard />
    </>
  );
}
