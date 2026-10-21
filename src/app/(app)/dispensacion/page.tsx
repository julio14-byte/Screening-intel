import { DispenseBoard } from "@/components/pharmacy/DispenseBoard";
import { PageHeader } from "@/components/ui/PageHeader";

export default function DispensacionPage() {
  return (
    <>
      <PageHeader title="Dispensación" />
      <DispenseBoard />
    </>
  );
}
