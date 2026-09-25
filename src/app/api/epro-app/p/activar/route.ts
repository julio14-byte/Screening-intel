import { NextResponse } from "next/server";
import { z } from "zod";
import {
  checkPublicRateLimit,
  clientIpFromRequest,
} from "@/lib/candidato/rate-limit";
import { recordEproMobileAudit } from "@/lib/epro-app/audit";
import {
  EPRO_MIGRATION_HINT,
  birthYearFromDate,
  hashOpaqueToken,
  hashPin,
  isMissingEproMobileSchema,
  isSixDigitPin,
  safeEqualText,
} from "@/lib/epro-app/crypto";
import { createEproSession, setEproCookie } from "@/lib/epro-app/session";
import { getServiceSupabase } from "@/lib/screening-services";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().min(16),
  birth_year: z.string().regex(/^\d{4}$/),
  pin: z.string(),
});

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (token.length < 16) {
    return NextResponse.json({ error: "Link inválido." }, { status: 404 });
  }
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("epro_activation_invites")
      .select("id, expires_at, used_at")
      .eq("token_hash", hashOpaqueToken(token))
      .maybeSingle();
    if (error) throw error;
    if (!data || data.used_at) {
      return NextResponse.json({ error: "Esta invitación ya no está activa." }, { status: 404 });
    }
    if (new Date(data.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "La invitación venció (48 horas)." }, { status: 410 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    if (isMissingEproMobileSchema(message)) {
      return NextResponse.json({ error: `${message}. ${EPRO_MIGRATION_HINT}` }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ip = clientIpFromRequest(request);
  const limited = checkPublicRateLimit(`epro-activar:${ip}`, 10, 3600);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Demasiados intentos. Probá más tarde." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success || !isSixDigitPin(parsed.data.pin)) {
    return NextResponse.json(
      { error: "Año de nacimiento (4 dígitos) y PIN de 6 dígitos." },
      { status: 400 }
    );
  }

  try {
    const supabase = getServiceSupabase();
    const { data: invite, error } = await supabase
      .from("epro_activation_invites")
      .select("id, organization_id, patient_id, expires_at, used_at, patients(birth_date, subject_code)")
      .eq("token_hash", hashOpaqueToken(parsed.data.token))
      .maybeSingle();
    if (error) throw error;
    if (!invite || invite.used_at) {
      return NextResponse.json({ error: "No se pudo activar." }, { status: 404 });
    }
    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "La invitación venció." }, { status: 410 });
    }

    const patient = Array.isArray(invite.patients) ? invite.patients[0] : invite.patients;
    const expectedYear = birthYearFromDate(
      (patient as { birth_date?: string } | null)?.birth_date
    );
    const subjectCode = String(
      (patient as { subject_code?: string } | null)?.subject_code ?? ""
    );
    if (!expectedYear || !safeEqualText(expectedYear, parsed.data.birth_year) || !subjectCode) {
      return NextResponse.json({ error: "No se pudo activar." }, { status: 403 });
    }

    const pinHash = await hashPin(parsed.data.pin);
    const { error: pinError } = await supabase.from("epro_patient_pins").upsert({
      patient_id: invite.patient_id,
      organization_id: invite.organization_id,
      pin_hash: pinHash,
      failed_attempts: 0,
      locked_until: null,
      activated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (pinError) throw pinError;

    await supabase
      .from("epro_activation_invites")
      .update({ used_at: new Date().toISOString() })
      .eq("id", invite.id);

    const sessionToken = await createEproSession(
      invite.organization_id as string,
      invite.patient_id as string
    );

    await recordEproMobileAudit({
      tableName: "patients",
      recordId: invite.patient_id as string,
      description: "Activación ePRO móvil: el sujeto configuró su PIN.",
      subjectCode,
      metadata: {
        event_type: "epro_activate",
        action: "PIN_SET",
      },
    });

    const response = NextResponse.json({ ok: true, subject_code: subjectCode });
    setEproCookie(response, sessionToken);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    if (isMissingEproMobileSchema(message)) {
      return NextResponse.json({ error: `${message}. ${EPRO_MIGRATION_HINT}` }, { status: 500 });
    }
    return NextResponse.json({ error: "No se pudo activar." }, { status: 400 });
  }
}
