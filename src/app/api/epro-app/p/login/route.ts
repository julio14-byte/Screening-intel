import { NextResponse } from "next/server";
import { z } from "zod";
import {
  checkPublicRateLimit,
  clientIpFromRequest,
} from "@/lib/candidato/rate-limit";
import {
  EPRO_LOCK_MS,
  EPRO_MAX_PIN_ATTEMPTS,
  EPRO_MIGRATION_HINT,
  isMissingEproMobileSchema,
  isSixDigitPin,
  verifyPin,
} from "@/lib/epro-app/crypto";
import { createEproSession, setEproCookie } from "@/lib/epro-app/session";
import { getServiceSupabase } from "@/lib/screening-services";

export const runtime = "nodejs";

const schema = z.object({
  subject_code: z.string().trim().regex(/^[0-9]{4,12}$/),
  pin: z.string(),
});

export async function POST(request: Request) {
  const ip = clientIpFromRequest(request);
  const limited = checkPublicRateLimit(`epro-login:${ip}`, 15, 3600);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Demasiados intentos." }, { status: 429 });
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
      { error: "Código de sujeto y PIN de 6 dígitos." },
      { status: 400 }
    );
  }

  try {
    const supabase = getServiceSupabase();
    const { data: patients, error } = await supabase
      .from("patients")
      .select("id, clinic_id, subject_code")
      .eq("subject_code", parsed.data.subject_code)
      .limit(8);
    if (error) throw error;

    const ids = (patients ?? []).map((row) => row.id as string);
    if (ids.length === 0) {
      return NextResponse.json({ error: "Código o PIN incorrectos." }, { status: 403 });
    }

    const { data: pins } = await supabase
      .from("epro_patient_pins")
      .select("patient_id, organization_id, pin_hash, failed_attempts, locked_until")
      .in("patient_id", ids);

    const now = Date.now();
    let matched: { patient_id: string; organization_id: string } | null = null;
    for (const pinRow of pins ?? []) {
      if (pinRow.locked_until && new Date(pinRow.locked_until).getTime() > now) {
        continue;
      }
      if (await verifyPin(parsed.data.pin, pinRow.pin_hash as string)) {
        matched = {
          patient_id: pinRow.patient_id as string,
          organization_id: pinRow.organization_id as string,
        };
        break;
      }
    }

    if (!matched) {
      for (const pinRow of pins ?? []) {
        const attempts = Number(pinRow.failed_attempts ?? 0) + 1;
        await supabase
          .from("epro_patient_pins")
          .update({
            failed_attempts: attempts,
            locked_until:
              attempts >= EPRO_MAX_PIN_ATTEMPTS
                ? new Date(now + EPRO_LOCK_MS).toISOString()
                : pinRow.locked_until,
            updated_at: new Date().toISOString(),
          })
          .eq("patient_id", pinRow.patient_id);
      }
      return NextResponse.json({ error: "Código o PIN incorrectos." }, { status: 403 });
    }

    await supabase
      .from("epro_patient_pins")
      .update({
        failed_attempts: 0,
        locked_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq("patient_id", matched.patient_id);

    const sessionToken = await createEproSession(
      matched.organization_id,
      matched.patient_id
    );
    const response = NextResponse.json({
      ok: true,
      subject_code: parsed.data.subject_code,
    });
    setEproCookie(response, sessionToken);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    if (isMissingEproMobileSchema(message)) {
      return NextResponse.json({ error: `${message}. ${EPRO_MIGRATION_HINT}` }, { status: 500 });
    }
    return NextResponse.json({ error: "No se pudo entrar." }, { status: 400 });
  }
}
