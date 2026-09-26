"use client";

import { useState } from "react";
import { BookOpen, IdCard, Save, Stethoscope, TestTubes } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorState } from "@/components/ui/StateMessage";
import { AnamnesisEditor } from "@/components/profile/AnamnesisEditor";
import { ClinicalMeasurementsEditor } from "@/components/profile/ClinicalMeasurementsEditor";
import { DemographicsEditor } from "@/components/profile/DemographicsEditor";
import { RoleGuard } from "@/components/rbac/RoleGuard";
import { useRole } from "@/contexts/role-context";
import { LabsEditor } from "@/components/profile/LabsEditor";
import type { ProfileUpdate } from "@/hooks/usePatientDetail";
import {
  hydrateAnamnesis,
  matchingConditions,
  matchingMedications,
} from "@/lib/profile/anamnesis";
import {
  catalogLaboratories,
  extraLaboratories,
  mergeLaboratories,
  withComputedBmi,
} from "@/lib/profile/clinical-measurements";
import {
  demographicsFromPatient,
  ethnicityLabel,
  studySubjectCaption,
} from "@/lib/profile/demographics";
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
  const [demographics, setDemographics] = useState(() =>
    demographicsFromPatient(patient)
  );
  const [anamnesis, setAnamnesis] = useState(() =>
    hydrateAnamnesis({
      anamnesis: profile?.anamnesis,
      conditions: profile?.conditions,
      medications: profile?.medications,
    })
  );
  const [laboratories, setLaboratories] = useState<Record<string, number>>(
    () => withComputedBmi(profile?.laboratories ?? {})
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const { isReadOnly, hasPermission } = useRole();
  const canEdit = hasPermission("profiles:write") && !isReadOnly;

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await onSave({
        conditions: matchingConditions(anamnesis),
        medications: matchingMedications(anamnesis),
        laboratories,
        anamnesis,
        demographics,
      });
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
        title={`${demographics.last_name || patient.last_name}, ${demographics.first_name || patient.first_name}`}
        description={[
          studySubjectCaption(demographics),
          demographics.birth_date
            ? `${calculateAge(demographics.birth_date)} años`
            : null,
          GENDER_LABELS[demographics.gender],
          demographics.ethnicity ? ethnicityLabel(demographics.ethnicity) : null,
          demographics.birth_date
            ? `Nac. ${formatDate(demographics.birth_date)}`
            : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <div className="flex items-center gap-3">
            {savedAt && !dirty ? (
              <span className="text-xs text-emerald-600">
                Guardado {savedAt.toLocaleTimeString("es-AR")}
              </span>
            ) : null}
            <RoleGuard permission="profiles:write">
              <Button onClick={handleSave} disabled={saving || !dirty || !canEdit}>
                <Save className="h-4 w-4" aria-hidden />
                {saving ? "Guardando…" : "Guardar perfil"}
              </Button>
            </RoleGuard>
          </div>
        }
      />

      {saveError ? (
        <div className="mb-4">
          <ErrorState message={saveError} />
        </div>
      ) : null}

      {!profile && canEdit ? (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Este paciente todavía no tiene perfil clínico (historia, antecedentes,
          medicamentos y laboratorios). Cargalo y guardá: el matcher no puede
          cruzar un expediente vacío.
        </p>
      ) : null}

      {isReadOnly ? (
        <p className="mb-4 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
          Modo solo lectura (Monitor CRA). Podés revisar el expediente y la
          bitácora de auditoría, sin modificar datos clínicos.
        </p>
      ) : null}

      <div className={`grid gap-4 lg:grid-cols-2 ${!canEdit ? "pointer-events-none opacity-80" : ""}`}>
        <Card className="lg:col-span-2">
          <CardHeader
            title="Datos demográficos y básicos"
            description="Identificación confidencial, código de sujeto, edad, sexo biológico y etnia"
            actions={<IdCard className="h-4 w-4 text-slate-400" aria-hidden />}
          />
          <CardBody>
            <DemographicsEditor
              value={demographics}
              onChange={(next) => {
                setDemographics(next);
                setDirty(true);
              }}
            />
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Historial médico completo (anamnesis)"
            description="Diagnósticos con fecha, síntomas, gravedad y evolución; cirugías; hospitalizaciones; medicación con dosis; alergias"
            actions={<BookOpen className="h-4 w-4 text-slate-400" aria-hidden />}
          />
          <CardBody>
            <AnamnesisEditor
              value={anamnesis}
              onChange={(next) => {
                setAnamnesis(next);
                setDirty(true);
              }}
            />
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Datos biométricos y clínicos"
            description="Mediciones directas: signos vitales, antropometría, laboratorio dirigido y prueba de embarazo"
            actions={<Stethoscope className="h-4 w-4 text-slate-400" aria-hidden />}
          />
          <CardBody>
            <ClinicalMeasurementsEditor
              labs={laboratories}
              gender={demographics.gender}
              onChange={(labs) => {
                setLaboratories(labs);
                setDirty(true);
              }}
            />
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Otros analitos"
            description="Valores extra para matching (ej. HbA1c). Los campos de arriba no se duplican acá."
            actions={<TestTubes className="h-4 w-4 text-slate-400" aria-hidden />}
          />
          <CardBody>
            <LabsEditor
              labs={extraLaboratories(laboratories)}
              onChange={(extra) => {
                setLaboratories(
                  mergeLaboratories(catalogLaboratories(laboratories), extra)
                );
                setDirty(true);
              }}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
