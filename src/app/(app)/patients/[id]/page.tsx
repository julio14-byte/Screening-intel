"use client";

import Link from "next/link";
import { use, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { PatientFollowUpCard } from "@/components/follow-up/PatientFollowUpCard";
import { PatientVisits } from "@/components/citas/PatientVisits";
import { AuditTimeline } from "@/components/audit/audit-timeline";
import { InclusionApprovalPanel } from "@/components/rbac/InclusionApprovalPanel";
import { ErrorState, LoadingState } from "@/components/ui/StateMessage";
import { PatientGaps } from "@/components/matching/PatientGaps";
import { buildPatientGaps } from "@/lib/matching/missing-data";
import { ClinicalProfileEditor } from "@/components/profile/ClinicalProfileEditor";
import { usePatientDetail } from "@/hooks/usePatientDetail";
import { useProtocols } from "@/hooks/useProtocols";

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { patient, profile, loading, error, saveProfile } =
    usePatientDetail(id);
  const { protocols } = useProtocols();
  const gaps = useMemo(
    () => (patient ? buildPatientGaps({ patient, profile }, protocols) : []),
    [patient, profile, protocols]
  );

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

      {gaps.length > 0 ? (
        <div className="mb-4">
          <PatientGaps gaps={gaps} />
        </div>
      ) : null}

      <ClinicalProfileEditor
        key={`${profile?.id ?? "new"}-${patient.updated_at ?? patient.subject_code ?? patient.id}`}
        patient={patient}
        profile={profile}
        onSave={saveProfile}
      />

      <div className="mt-6">
        <PatientVisits patientId={patient.id} />
      </div>

      <PatientFollowUpCard patientId={patient.id} protocols={protocols} />

      <div className="mt-6">
        <AuditTimeline tableName="patients" recordId={patient.id} />
      </div>

      <InclusionApprovalPanel patientId={patient.id} />
    </>
  );
}
