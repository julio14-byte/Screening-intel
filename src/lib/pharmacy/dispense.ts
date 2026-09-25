import { createHash, randomBytes } from "node:crypto";

export function newDiaryToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashDiaryToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isMissingDispenseSchema(message: string | undefined): boolean {
  if (!message) return false;
  const mentions =
    /kit_code|first_dose|dosing_diary_entries|dosing_diary_links/i.test(message);
  const missing =
    /does not exist|schema cache|could not find|PGRST205|PGRST200/i.test(
      message
    );
  return mentions && missing;
}

export const FIRST_DOSE_MODE_LABEL = {
  clinic: "Primera dosis en la clínica",
  home: "Oral para llevar a casa",
} as const;

export type FirstDoseMode = keyof typeof FIRST_DOSE_MODE_LABEL;

export const DIARY_MIGRATION_HINT =
  "Falta aplicar supabase/migrations/20260925010000_dispense_first_dose_diary.sql y recargar el schema.";
