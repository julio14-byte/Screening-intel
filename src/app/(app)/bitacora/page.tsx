import { PageHeader } from "@/components/ui/PageHeader";
import { ScreeningLogView } from "@/components/screening-log/ScreeningLogView";

export default function BitacoraPage() {
  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title="Bitácora de screening"
          description="Registro por protocolo, identificado solo con el código de sujeto."
        />
      </div>
      <ScreeningLogView />
    </>
  );
}
