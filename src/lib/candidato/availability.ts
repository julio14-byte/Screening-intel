/**
 * El pre-registro público queda apagado hasta que el entorno lo encienda.
 * Un centro con el portal activo en configuración no abre el formulario solo.
 */
export function isCandidatePortalEnabled(): boolean {
  const raw = process.env.CANDIDATE_PORTAL_ENABLED?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

export const CANDIDATE_PORTAL_CLOSED_MESSAGE =
  "El pre-registro público todavía no está abierto.";

/** Respuesta al visitante. No dice si califica para un protocolo. */
export const CANDIDATE_INTAKE_ACK =
  "Recibimos tu pre-registro. Un coordinador del centro lo revisará y te contactará.";
