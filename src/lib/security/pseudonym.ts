import { createHash } from "node:crypto";

/** Hash corto para correlacionar eventos sin escribir correos en los logs (solo Node). */
export function pseudonym(value: string): string {
  return createHash("sha256").update(value.toLowerCase()).digest("hex").slice(0, 12);
}
