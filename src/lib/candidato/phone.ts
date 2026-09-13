/** Normaliza un teléfono a E.164. Exige código de país. */
export function normalizeE164(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("El candidato no dejó teléfono.");
  }

  let digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) {
    digits = `+${digits.slice(2)}`;
  }
  if (digits.startsWith("+")) {
    const rest = digits.slice(1).replace(/\D/g, "");
    if (rest.length < 8 || rest.length > 15) {
      throw new Error("Teléfono inválido. Usa código de país, ej. +52 55…");
    }
    return `+${rest}`;
  }

  const only = digits.replace(/\D/g, "");
  if (only.length < 11 || only.length > 15) {
    throw new Error(
      "Incluye código de país en el teléfono (ej. +52, +54, +57)."
    );
  }
  return `+${only}`;
}

export function e164Digits(e164: string): string {
  return e164.replace(/\D/g, "");
}

export function maskPhone(e164: string): string {
  const d = e164Digits(e164);
  if (d.length < 4) return "****";
  return `+…${d.slice(-4)}`;
}
