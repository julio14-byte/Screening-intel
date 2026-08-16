import { DashboardView } from "@/components/dashboard/DashboardView";

export const dynamic = "force-dynamic";

export default function SemaforosPage() {
  return (
    <DashboardView
      title="Semáforos de Inclusión / Exclusión"
      defaultTrafficFilter="pending"
    />
  );
}
