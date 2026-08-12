"use client";

import { useState } from "react";
import { HeartPulse, Pill, Save, TestTubes } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorState } from "@/components/ui/StateMessage";
import { LabsEditor } from "@/components/profile/LabsEditor";
import { TagListEditor } from "@/components/profile/TagListEditor";
import type { ProfileUpdate } from "@/hooks/usePatientDetail";
import type { ClinicalProfile, Patient } from "@/lib/types";
import { calculateAge, formatDate, GENDER_LABELS } from "@/lib/utils";

/**
 * Editor del perfil clínico. Montarlo con `key` por perfil para que el estado
 * del formulario se inicialice desde props (sin sincronización en efectos).
 */
export function ClinicalProfileEditor({
  patient,
  profile,
  onSave,
}: {
  patient: Patient;
  profile: ClinicalProfile | null;
  onSave: (update: ProfileUpdate) => Promise<void>;
}) {
  const [conditions, setConditions] = useState<string[]>(
    profile?.conditions ?? []
  );
  const [medications, setMedications] = useState<string[]>(
    profile?.medications ?? []
  );
  const [laboratories, setLaboratories] = useState<Record<string, number>>(
    profile?.laboratories ?? {}
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await onSave({ conditions, medications, laboratories });
      setDirty(false);
      setSavedAt(new Date());
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "No se pudo guardar el perfil"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title={`${patient.last_name}, ${patient.first_name}`}
        description={`${calculateAge(patient.birth_date)} años · ${GENDER_LABELS[patient.gender]} · Nac. ${formatDate(patient.birth_date)}`}
        actions={
          <div className="flex items-center gap-3">
            {savedAt && !dirty ? (
              <span className="text-xs text-emerald-600">
                Guardado {savedAt.toLocaleTimeString("es-AR")}
              </span>
            ) : null}
            <Button onClick={handleSave} disabled={saving || !dirty}>
              <Save className="h-4 w-4" aria-hidden />
              {saving ? "Guardando…" : "Guardar perfil"}
            </Button>
          </div>
        }
      />

      {saveError ? (
        <div className="mb-4">
          <ErrorState message={saveError} />
        </div>
      ) : null}

      {!profile ? (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Este paciente todavía no tiene perfil clínico. Cargá sus datos y
          guardá para habilitar el matching contra protocolos.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Condiciones médicas"
            description="Patologías y diagnósticos activos"
            actions={<HeartPulse className="h-4 w-4 text-slate-400" aria-hidden />}
          />
          <CardBody>
            <TagListEditor
              label="condiciones"
              items={conditions}
              onChange={(items) => {
                setConditions(items);
                setDirty(true);
              }}
              placeholder="ej: diabetes tipo 2"
              emptyText="Sin condiciones registradas."
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Medicación concomitante"
            description="Tratamientos actuales del paciente"
            actions={<Pill className="h-4 w-4 text-slate-400" aria-hidden />}
          />
          <CardBody>
            <TagListEditor
              label="medicamentos"
              items={medications}
              onChange={(items) => {
                setMedications(items);
                setDirty(true);
              }}
              placeholder="ej: metformina"
              emptyText="Sin medicación registrada."
            />
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Laboratorios recientes"
            description="Últimos valores disponibles, usados por el motor de matching"
            actions={<TestTubes className="h-4 w-4 text-slate-400" aria-hidden />}
          />
          <CardBody>
            <LabsEditor
              labs={laboratories}
              onChange={(labs) => {
                setLaboratories(labs);
                setDirty(true);
              }}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
