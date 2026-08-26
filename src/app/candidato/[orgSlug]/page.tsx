import { CandidatoIntakeForm } from "@/components/candidato/CandidatoIntakeForm";
import { CandidatoPortalError } from "@/components/candidato/CandidatoPortalError";
import { loadPortalOrganization } from "@/lib/candidato/load-portal-org";

export default async function CandidatoSitePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-indigo-950">Pre-registro</h1>
        <p className="mt-2 text-sm text-indigo-700">
          Completa el formulario. No necesitas resultados de laboratorio.
        </p>
      </div>
      <CandidatoIntakeForm
        orgSlug={orgSlug}
        config={{
          organization: { name: org.name, slug: org.slug ?? orgSlug },
        }}
      />
    </div>
  );
}
