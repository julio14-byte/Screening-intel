import { notFound } from "next/navigation";
import { CandidatoIntakeForm } from "@/components/candidato/CandidatoIntakeForm";
import { getServiceSupabase } from "@/lib/screening-services";

export default async function CandidatoProtocolPage({
  params,
}: {
  params: Promise<{ orgSlug: string; protocolCode: string }>;
}) {
  const { orgSlug, protocolCode } = await params;
  const supabase = getServiceSupabase();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug, portal_enabled")
    .eq("slug", orgSlug.toLowerCase())
    .maybeSingle();

  if (!org || !org.portal_enabled) {
    notFound();
  }

  const { data: protocol } = await supabase
    .from("protocols")
    .select("title, code_name, status")
    .eq("clinic_id", org.id)
    .eq("code_name", protocolCode)
    .eq("status", "active")
    .maybeSingle();

  if (!protocol) {
    notFound();
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
