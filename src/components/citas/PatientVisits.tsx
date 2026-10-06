"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { NewVisitModal, RescheduleModal } from "@/components/citas/NewVisitModal";
import { VisitCard } from "@/components/citas/VisitCard";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/StateMessage";
import { useRole } from "@/contexts/role-context";
import { usePatients } from "@/hooks/usePatients";
import { useProtocols } from "@/hooks/useProtocols";
import { useVisits } from "@/hooks/useVisits";
import type { VisitRow } from "@/lib/ops/visits";

export function PatientVisits({ patientId }: { patientId: string }) {
  const { isReadOnly } = useRole();
  const { patients } = usePatients();
  const { protocols } = useProtocols();
  const { visits, loading, error, setError, createVisit, patchVisit } =
    useVisits(patientId);
  const [creating, setCreating] = useState(false);
  const [rescheduling, setRescheduling] = useState<VisitRow | null>(null);
  const ordered = [...visits].reverse();

  return (
    <Card>
      <CardHeader
        title="Citas"
        description="Próximas y pasadas de este paciente."
        actions={
          isReadOnly ? null : (
            <Button onClick={() => setCreating(true)}>
              <CalendarPlus className="h-4 w-4" aria-hidden /> Agendar cita
            </Button>
          )
        }
      />
      <CardBody>
        {error ? <ErrorState message={error} /> : null}
        {loading ? (
          <LoadingState label="Cargando citas…" />
        ) : ordered.length === 0 ? (
          <p className="text-sm text-slate-500">Todavía no hay citas para este paciente.</p>
        ) : (
          <ul className="space-y-2">
            {ordered.map((visit) => (
              <VisitCard
                key={visit.id}
                visit={visit}
                hidePatient
                showDate
                readOnly={isReadOnly}
                onPatch={patchVisit}
                onReschedule={setRescheduling}
              />
            ))}
          </ul>
        )}
      </CardBody>
      <NewVisitModal
        open={creating}
        onClose={() => setCreating(false)}
        patients={patients}
        protocols={protocols}
        visits={visits}
        lockedPatientId={patientId}
        onCreate={createVisit}
      />
      <RescheduleModal
        visit={rescheduling}
        onClose={() => setRescheduling(null)}
        onSave={async (id, scheduledAt) => {
          setError(null);
          await patchVisit(id, { scheduled_at: scheduledAt });
        }}
      />
    </Card>
  );
}
