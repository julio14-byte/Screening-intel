"use client";

import Link from "next/link";
import { use } from "react";
import { ArrowLeft } from "lucide-react";
import { AuditTimeline } from "@/components/audit/audit-timeline";
import { InclusionApprovalPanel } from "@/components/rbac/InclusionApprovalPanel";
import { ErrorState, LoadingState } from "@/components/ui/StateMessage";
import { ElectronicPrescriptionPanel } from "@/components/pharmacy/ElectronicPrescriptionPanel";
import { PatientIwrsCard } from "@/components/iwrs/PatientIwrsCard";
import { VisitLog } from "@/components/ops/VisitLog";
import { ClinicalProfileEditor } from "@/components/profile/ClinicalProfileEditor";
import { usePatientDetail } from "@/hooks/usePatientDetail";
import { useProtocols } from "@/hooks/useProtocols";

export default function PatientDetailPage({
  params,
}: PageProps<"/patients/[id]">) {
  const { id } = use(params);
  const { patient, profile, loading, error, saveProfile } =
    usePatientDetail(id);
  const { protocols } = useProtocols();

  if (loading) return <LoadingState label="Cargando perfil clínico…" />;
  if (error || !patient)
    return <ErrorState message={error ?? "Paciente no encontrado"} />;

  return (
    <>
      <Link
        href="/patients"
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Volver al registro
      </Link>

      <ClinicalProfileEditor
        key={`${profile?.id ?? "new"}-${patient.updated_at ?? patient.subject_code ?? patient.id}`}
        patient={patient}
        profile={profile}
        onSave={saveProfile}
      />

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-indigo-950">Visitas con el médico</h2>
        <VisitLog
          patientId={patient.id}
          title="Registrar visita"
          description="Fecha, médico y nota clínica de esta consulta."
        />
      </div>

      <ElectronicPrescriptionPanel
        patientId={patient.id}
        protocols={protocols}
      />

      <PatientIwrsCard patientId={patient.id} />

      <div className="mt-6">
        <AuditTimeline tableName="patients" recordId={patient.id} />
      </div>

      <InclusionApprovalPanel patientId={patient.id} />
    </>
  );
}
