import { notFound } from "next/navigation";
import { CandidatoIntakeForm } from "@/components/candidato/CandidatoIntakeForm";
import { getServiceSupabase } from "@/lib/screening-services";

export default async function CandidatoSitePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const supabase = getServiceSupabase();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug, portal_enabled")
    .eq("slug", orgSlug.toLowerCase())
    .maybeSingle();

  if (!org || !org.portal_enabled) {
    notFound();
  }

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
