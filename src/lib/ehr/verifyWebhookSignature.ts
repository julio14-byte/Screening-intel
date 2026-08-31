import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * Verifica firma HMAC-SHA256 del webhook EHR.
 * Header esperado: `X-EHR-Signature: sha256=<hex>`
 */
export function verifyEhrWebhookSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader?.trim() || !secret) return false;

  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const provided = signatureHeader.replace(/^sha256=/i, "").trim();

  try {
    const a = Buffer.from(provided, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Genera un secreto aleatorio para webhooks EHR. */
export function generateEhrWebhookSecret(): string {
  return randomBytes(32).toString("hex");
}
