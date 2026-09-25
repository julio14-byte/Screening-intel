import { InventoryBoard } from "@/components/pharmacy/InventoryBoard";
import { PageHeader } from "@/components/ui/PageHeader";

export default function InventarioPage() {
  return (
    <>
      <PageHeader
        title="Inventario de medicamentos"
        description="Lotes de la farmacéutica. La caja IWRS y la primera dosis se registran en Dispensación."
      />
      <InventoryBoard />
    </>
  );
}
