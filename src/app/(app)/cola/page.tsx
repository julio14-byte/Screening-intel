import { TaskQueueBoard } from "@/components/ops/TaskQueueBoard";
import { PageHeader } from "@/components/ui/PageHeader";

export default function ColaPage() {
  return (
    <>
      <PageHeader
        title="Cola de trabajo"
        description="Inbox, criterios pendientes y re-match en tareas del centro. El coordinador confirma cada paso."
      />
      <TaskQueueBoard />
    </>
  );
}
