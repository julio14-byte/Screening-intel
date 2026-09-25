import { NextResponse } from "next/server";
import {
  EPRO_IDLE_MS,
  EPRO_SESSION_COOKIE,
  hashOpaqueToken,
  newOpaqueToken,
} from "@/lib/epro-app/crypto";
import { getServiceSupabase } from "@/lib/screening-services";

export type EproSession = {
  sessionId: string;
  patientId: string;
  organizationId: string;
  subjectCode: string;
};

export function eproCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(EPRO_IDLE_MS / 1000),
  };
}

export function clearEproCookie(response: NextResponse) {
  response.cookies.set(EPRO_SESSION_COOKIE, "", {
    ...eproCookieOptions(),
    maxAge: 0,
  });
}

export function setEproCookie(response: NextResponse, token: string) {
  response.cookies.set(EPRO_SESSION_COOKIE, token, eproCookieOptions());
}

export async function createEproSession(
  organizationId: string,
  patientId: string
): Promise<string> {
  const supabase = getServiceSupabase();
  await supabase
    .from("epro_patient_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("patient_id", patientId)
    .is("revoked_at", null);

  const token = newOpaqueToken();
  const expiresAt = new Date(Date.now() + EPRO_IDLE_MS).toISOString();
  const { error } = await supabase.from("epro_patient_sessions").insert({
    organization_id: organizationId,
    patient_id: patientId,
    token_hash: hashOpaqueToken(token),
    expires_at: expiresAt,
    last_seen_at: new Date().toISOString(),
  });
  if (error) throw error;
  return token;
}

export async function loadEproSession(
  token: string | undefined
): Promise<EproSession | null> {
  if (!token || token.length < 16) return null;
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("epro_patient_sessions")
    .select(
      "id, patient_id, organization_id, expires_at, revoked_at, patients(subject_code)"
    )
    .eq("token_hash", hashOpaqueToken(token))
    .maybeSingle();
  if (error || !data || data.revoked_at) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;

  const patient = Array.isArray(data.patients) ? data.patients[0] : data.patients;
  const subjectCode = String(
    (patient as { subject_code?: string } | null)?.subject_code ?? ""
  );
  if (!subjectCode) return null;

  const nextExpiry = new Date(Date.now() + EPRO_IDLE_MS).toISOString();
  await supabase
    .from("epro_patient_sessions")
    .update({
      last_seen_at: new Date().toISOString(),
      expires_at: nextExpiry,
    })
    .eq("id", data.id);

  return {
    sessionId: data.id as string,
    patientId: data.patient_id as string,
    organizationId: data.organization_id as string,
    subjectCode,
  };
}

export async function revokeEproSession(token: string | undefined) {
  if (!token) return;
  const supabase = getServiceSupabase();
  await supabase
    .from("epro_patient_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token_hash", hashOpaqueToken(token))
    .is("revoked_at", null);
}

export function eproTokenFromRequest(request: Request): string | undefined {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)epro-session=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}
