import { ScreeningProcessNote } from "@/components/screening/ScreeningProcessNote";
import { IwrsBoard } from "@/components/iwrs/IwrsBoard";
import { PageHeader } from "@/components/ui/PageHeader";

export default function IwrsPage() {
  return (
    <>
      <PageHeader
        title="IWRS"
        description="Interactive Web Response: kit y brazo después del screening. Puede ser del centro o del IRT del sponsor (Lilly, IQVIA, etc.). No elige quién entra al estudio."
      />
      <ScreeningProcessNote compact />
      <IwrsBoard />
    </>
  );
}
