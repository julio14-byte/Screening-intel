import { CandidatoIntakeForm } from "@/components/candidato/CandidatoIntakeForm";
import { CandidatoPortalError } from "@/components/candidato/CandidatoPortalError";
import { loadPortalOrganization } from "@/lib/candidato/load-portal-org";
import { createClient } from "@/lib/supabase/server";

export default async function CandidatoProtocolPage({
  params,
}: {
  params: Promise<{ orgSlug: string; protocolCode: string }>;
}) {
  const { orgSlug, protocolCode } = await params;
  const result = await loadPortalOrganization(orgSlug);

  if (result.status === "not_found") {
    return <CandidatoPortalError kind="not_found" orgSlug={orgSlug} />;
  }

  if (result.status === "portal_disabled") {
    return <CandidatoPortalError kind="portal_disabled" orgSlug={orgSlug} />;
  }

  if (result.status === "error") {
    return (
      <CandidatoPortalError kind="error" orgSlug={orgSlug} detail={result.message} />
    );
  }

  const org = result.org;
  const supabase = await createClient();

  const { data: protocol } = await supabase
    .from("protocols")
    .select("title, code_name, status")
    .eq("clinic_id", org.id)
    .eq("code_name", protocolCode)
    .eq("status", "active")
    .maybeSingle();

  if (!protocol) {
    return (
      <CandidatoPortalError
        kind="not_found"
        orgSlug={orgSlug}
        detail={`No hay un estudio activo con código «${protocolCode}».`}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-indigo-950">Pre-registro al estudio</h1>
        <p className="mt-2 text-sm text-indigo-700">
          {protocol.title} — sin laboratorios; un coordinador te contactará.
        </p>
      </div>
      <CandidatoIntakeForm
        orgSlug={orgSlug}
        protocolCode={protocolCode}
        config={{
          organization: { name: org.name, slug: org.slug ?? orgSlug },
          protocol: protocol,
        }}
      />
    </div>
  );
}
