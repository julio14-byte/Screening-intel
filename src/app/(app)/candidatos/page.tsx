import { CandidatosInbox } from "@/components/candidatos/CandidatosInbox";
import { PageHeader } from "@/components/ui/PageHeader";
import Link from "next/link";
import { routes } from "@/lib/app/routes";

export default function CandidatosPage() {
  return (
    <>
      <PageHeader title="Candidatos" />
      <p className="mb-4 text-sm text-indigo-600">
        <Link href={routes.app.portalSettings} className="text-violet-600 underline">
          Configurar portal y copiar links
        </Link>
      </p>
      <CandidatosInbox />
    </>
  );
}
