import { CandidatosInbox } from "@/components/candidatos/CandidatosInbox";
import { PageHeader } from "@/components/ui/PageHeader";
import Link from "next/link";
import { routes } from "@/lib/app/routes";

export default function CandidatosPage() {
  return (
    <>
      <PageHeader
        title="Candidatos (portal)"
        description="Leads del pre-registro público. Usá el briefing IA para la llamada y convertí a paciente cuando confirmes los datos."
      />
      <p className="mb-4 text-sm text-indigo-600">
        <Link href={routes.app.portalSettings} className="text-violet-600 underline">
          Configurar portal y copiar links
        </Link>
      </p>
      <CandidatosInbox />
    </>
  );
}
