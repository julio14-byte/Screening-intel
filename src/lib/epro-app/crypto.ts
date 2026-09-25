import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
export {
  EPRO_IDLE_MS,
  EPRO_INVITE_MS,
  EPRO_PIN_LENGTH,
  EPRO_MAX_PIN_ATTEMPTS,
  EPRO_LOCK_MS,
  EPRO_SESSION_COOKIE,
} from "@/lib/epro-app/constants";

const scryptAsync = promisify(scrypt);

export function newOpaqueToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isSixDigitPin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  const key = (await scryptAsync(pin, salt, 32)) as Buffer;
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const key = (await scryptAsync(pin, Buffer.from(saltHex, "hex"), 32)) as Buffer;
  const expected = Buffer.from(hashHex, "hex");
  if (key.length !== expected.length) return false;
  return timingSafeEqual(key, expected);
}

export function safeEqualText(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) {
    timingSafeEqual(a, Buffer.alloc(a.length));
    return false;
  }
  return timingSafeEqual(a, b);
}

export function birthYearFromDate(isoDate: string | null | undefined): string | null {
  if (!isoDate || isoDate.length < 4) return null;
  const year = isoDate.slice(0, 4);
  return /^\d{4}$/.test(year) ? year : null;
}

export function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isMissingEproMobileSchema(message: string | undefined): boolean {
  if (!message) return false;
  const mentions =
    /epro_activation_invites|epro_patient_pins|epro_patient_sessions|epro_daily_answers|epro_activation_status|cadence/i.test(
      message
    );
  const missing =
    /does not exist|schema cache|could not find|PGRST205|PGRST200/i.test(message);
  return mentions && missing;
}

export const EPRO_MIGRATION_HINT =
  "Falta aplicar supabase/migrations/20260925020000_epro_mobile_patient.sql y recargar el schema.";
