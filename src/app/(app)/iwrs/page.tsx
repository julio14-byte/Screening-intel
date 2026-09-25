import { ScreeningProcessNote } from "@/components/screening/ScreeningProcessNote";
import { IwrsBoard } from "@/components/iwrs/IwrsBoard";
import { PageHeader } from "@/components/ui/PageHeader";

export default function IwrsPage() {
  return (
    <>
      <PageHeader
        title="IWRS"
        description="Módulo independiente conectado por /api/iwrs. Screening y EDC piden kit y brazo acá; el matcher no randomiza."
      />
      <ScreeningProcessNote compact />
      <IwrsBoard />
    </>
  );
}
