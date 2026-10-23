import { CandidatoHubForm } from "@/components/candidato/CandidatoHubForm";
import { CandidatoPortalClosed } from "@/components/candidato/CandidatoPortalClosed";
import { isCandidatePortalEnabled } from "@/lib/candidato/availability";

export default function CandidatoHubPage() {
  if (!isCandidatePortalEnabled()) return <CandidatoPortalClosed />;
  return <CandidatoHubForm />;
}
