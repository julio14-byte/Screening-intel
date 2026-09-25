import { ScreeningProcessNote } from "@/components/screening/ScreeningProcessNote";
import { IwrsBoard } from "@/components/iwrs/IwrsBoard";
import { PageHeader } from "@/components/ui/PageHeader";

export default function IwrsPage() {
  return (
    <>
      <PageHeader
        title="IWRS"
        description="Interactive Web Response: sorteo controlado del kit/brazo después del screening. No elige quién entra al estudio."
      />
      <ScreeningProcessNote compact />
      <IwrsBoard />
    </>
  );
}
