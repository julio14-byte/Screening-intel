/** Evento de seguridad estructurado (JSON por línea) para SIEM / alertas del host. Compatible con Edge. */
export function securityEvent(
  event: string,
  fields: Record<string, string | number | boolean | null | undefined> = {}
) {
  console.warn(JSON.stringify({ level: "security", event, at: new Date().toISOString(), ...fields }));
}
