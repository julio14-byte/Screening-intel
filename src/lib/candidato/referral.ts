import { randomInt } from "node:crypto";

/** Código legible para el candidato, ej. PS-2026-A1B2C3 */
export function generateReferralCode(): string {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars[randomInt(chars.length)];
  }
  return `PS-${year}-${suffix}`;
}
