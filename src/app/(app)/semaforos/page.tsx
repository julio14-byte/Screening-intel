import { DashboardView } from "@/components/dashboard/DashboardView";

export const dynamic = "force-dynamic";

export default function SemaforosPage() {
  return (
    <DashboardView
      title="Semáforos de Inclusión / Exclusión"
      description="Revisión rápida del estado clínico por paciente y protocolo."
      defaultTrafficFilter="pending"
    />
  );
}
