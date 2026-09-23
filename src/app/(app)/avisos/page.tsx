import { NoticeList } from "@/components/ops/Notices";
import { PageHeader } from "@/components/ui/PageHeader";

export default function AvisosPage() {
  return (
    <>
      <PageHeader
        title="Avisos"
        description="Candidato nuevo, screen failure y tarea vencida. Se generan al actualizar la cola."
      />
      <NoticeList />
    </>
  );
}
