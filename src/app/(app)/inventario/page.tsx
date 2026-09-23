import { InventoryBoard } from "@/components/pharmacy/InventoryBoard";
import { PageHeader } from "@/components/ui/PageHeader";

export default function InventarioPage() {
  return (
    <>
      <PageHeader
        title="Inventario de medicamentos"
        description="Lotes que envía la farmacéutica y stock que queda al entregar recetas."
      />
      <InventoryBoard />
    </>
  );
}
