import { NoticeList } from "@/components/ops/Notices";
import { PageHeader } from "@/components/ui/PageHeader";

export default function AvisosPage() {
  return (
    <>
      <PageHeader
        title="Avisos"
        description="Candidato nuevo y screen failure. El coordinador confirma cada paso en Candidatos, Tracker o Re-Match.",
      />
      <NoticeList />
    </>
  );
}
