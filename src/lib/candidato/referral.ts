/** Código legible para el candidato, ej. PS-2026-A1B2 */
export function generateReferralCode(): string {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `PS-${year}-${suffix}`;
}
