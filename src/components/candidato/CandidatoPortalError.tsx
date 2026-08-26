import Link from "next/link";
import { candidatoPaths } from "@/lib/candidato/paths";
import { Button } from "@/components/ui/Button";

export function CandidatoPortalError({
  kind,
  orgSlug,
  detail,
}: {
  kind: "not_found" | "portal_disabled" | "error";
  orgSlug?: string;
  detail?: string;
}) {
  const titles: Record<string, string> = {
    not_found: "Centro no encontrado",
    portal_disabled: "Portal no activo",
    error: "No se pudo abrir el pre-registro",
  };

  const messages: Record<string, string> = {
    not_found:
      "Revisá el código con tu coordinador. Usá el link completo que te enviaron o el slug exacto (ej. demo o demo-a1b2c3d4).",
    portal_disabled:
      "Este centro existe pero el portal de candidatos no está activado. El investigador debe activarlo en Configuración → Portal de candidatos y guardar.",
    error:
      detail ??
      "Error de configuración del servidor. Si eres coordinador, verifica Supabase y Vercel.",
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
      <p className="font-semibold">{titles[kind]}</p>
      {orgSlug ? (
        <p className="mt-1 text-xs text-amber-800">
          Código ingresado: <code className="font-mono">{orgSlug}</code>
        </p>
      ) : null}
      <p className="mt-2 leading-relaxed">{messages[kind]}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={candidatoPaths.hub}>
          <Button variant="secondary">Volver</Button>
        </Link>
        <Link href="/login">
          <Button variant="secondary">Acceso coordinadores</Button>
        </Link>
      </div>
    </div>
  );
}
