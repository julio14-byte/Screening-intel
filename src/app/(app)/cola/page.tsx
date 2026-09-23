import { TaskQueueBoard } from "@/components/ops/TaskQueueBoard";
import { PageHeader } from "@/components/ui/PageHeader";

export default function ColaPage() {
  return (
    <>
      <PageHeader
        title="Cola de trabajo"
        description="Tareas guardadas del centro. El agente propone; esta lista sigue ahí si cierras el chat."
      />
      <TaskQueueBoard />
    </>
  );
}
