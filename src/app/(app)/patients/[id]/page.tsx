"use client";

import Link from "next/link";
import { use } from "react";
import { ArrowLeft } from "lucide-react";
import { AuditTimeline } from "@/components/audit/audit-timeline";
import { ErrorState, LoadingState } from "@/components/ui/StateMessage";
import { ClinicalProfileEditor } from "@/components/profile/ClinicalProfileEditor";
import { usePatientDetail } from "@/hooks/usePatientDetail";

export default function PatientDetailPage({
  params,
}: PageProps<"/patients/[id]">) {
  const { id } = use(params);
  const { patient, profile, loading, error, saveProfile } =
    usePatientDetail(id);

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
        key={profile?.id ?? "new"}
        patient={patient}
        profile={profile}
        onSave={saveProfile}
      />

      <div className="mt-6">
        <AuditTimeline tableName="patients" recordId={patient.id} />
      </div>
    </>
  );
}
