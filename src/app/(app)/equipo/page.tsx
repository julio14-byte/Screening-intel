import { PageHeader } from "@/components/ui/PageHeader";
import { TeamView } from "@/components/team/TeamView";

export default function EquipoPage() {
  return (
    <>
      <PageHeader
        title="Equipo y delegación"
        description="Quién puede hacer qué en cada estudio, con vigencia de GCP y licencia."
      />
      <TeamView />
    </>
  );
}
