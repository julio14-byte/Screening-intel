import { NextResponse } from "next/server";
import { z } from "zod";
import {
  checkPublicRateLimit,
  clientIpFromRequest,
} from "@/lib/candidato/rate-limit";
import { recordEproMobileAudit } from "@/lib/epro-app/audit";
import {
  EPRO_MIGRATION_HINT,
  isMissingEproMobileSchema,
  utcToday,
} from "@/lib/epro-app/crypto";
import {
  clearEproCookie,
  eproTokenFromRequest,
  loadEproSession,
  setEproCookie,
} from "@/lib/epro-app/session";
import { sanitizeAnswerValue } from "@/lib/epro-app/sanitize";
import { getServiceSupabase } from "@/lib/screening-services";
import type { EproQuestion } from "@/lib/types";

const submitSchema = z.object({
  answers: z.record(
    z.string().max(80),
    z.union([z.string().max(500), z.number(), z.boolean()])
  ),
});

async function requireSession(request: Request) {
  const token = eproTokenFromRequest(request);
  const session = await loadEproSession(token);
  if (!session) {
    const response = NextResponse.json({ error: "Sesión vencida. Volvé a entrar." }, { status: 401 });
    clearEproCookie(response);
    return { ok: false as const, response };
  }
  return { ok: true as const, session, token };
}

function clinicIdOf(
  rel: { clinic_id?: string } | { clinic_id?: string }[] | null | undefined
): string | null {
  if (!rel) return null;
  const row = Array.isArray(rel) ? rel[0] : rel;
  return row?.clinic_id ?? null;
}

async function loadDailyForm(organizationId: string, patientId: string) {
  const supabase = getServiceSupabase();
  const { data: screenings } = await supabase
    .from("screenings")
    .select("protocol_id, protocols(clinic_id)")
    .eq("patient_id", patientId);

  const protocolIds = (screenings ?? [])
    .filter((row) => clinicIdOf(row.protocols) === organizationId)
    .map((row) => row.protocol_id as string)
    .filter(Boolean);

  const { data: forms, error } = await supabase
    .from("epro_forms")
    .select("id, title, description, questions, cadence, protocol_id, active, protocols(clinic_id)")
    .eq("active", true)
    .eq("cadence", "daily")
    .order("created_at", { ascending: false })
    .limit(16);
  if (error) throw error;

  const pool = forms ?? [];
  const matched = pool.find((form) => {
    if (!form.protocol_id || !protocolIds.includes(form.protocol_id as string)) {
      return false;
    }
    return clinicIdOf(form.protocols) === organizationId;
  });
  return matched ?? pool.find((item) => !item.protocol_id) ?? null;
}

export async function GET(request: Request) {
  const gate = await requireSession(request);
  if (!gate.ok) return gate.response;

  try {
    const form = await loadDailyForm(gate.session.organizationId, gate.session.patientId);
    if (!form) {
      return NextResponse.json({
        subject_code: gate.session.subjectCode,
        completed: false,
        form: null,
      });
    }

    const supabase = getServiceSupabase();
    const answeredOn = utcToday();
    const { data: existing } = await supabase
      .from("epro_daily_answers")
      .select("id, submitted_at")
      .eq("patient_id", gate.session.patientId)
      .eq("form_id", form.id)
      .eq("answered_on", answeredOn)
      .maybeSingle();

    const questions = (form.questions ?? []) as EproQuestion[];
    const response = NextResponse.json({
      subject_code: gate.session.subjectCode,
      completed: Boolean(existing),
      answered_on: answeredOn,
      submitted_at: existing?.submitted_at ?? null,
      form: {
        id: form.id,
        title: form.title,
        description: form.description,
        questions,
      },
    });
    if (gate.token) setEproCookie(response, gate.token);
    return response;
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
  const limited = checkPublicRateLimit(`epro-hoy:${ip}`, 30, 3600);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Demasiados envíos." }, { status: 429 });
  }

  const gate = await requireSession(request);
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Respuestas inválidas." }, { status: 400 });
  }

  try {
    const form = await loadDailyForm(gate.session.organizationId, gate.session.patientId);
    if (!form) {
      return NextResponse.json({ error: "No hay cuestionario diario activo." }, { status: 404 });
    }

    const questions = (form.questions ?? []) as EproQuestion[];
    const allowed = new Set(questions.map((q) => q.id));
    const answers: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(parsed.data.answers)) {
      if (allowed.has(key)) answers[key] = sanitizeAnswerValue(value);
    }

    const supabase = getServiceSupabase();
    const answeredOn = utcToday();
    const { data, error } = await supabase
      .from("epro_daily_answers")
      .insert({
        organization_id: gate.session.organizationId,
        patient_id: gate.session.patientId,
        form_id: form.id,
        answered_on: answeredOn,
        answers,
      })
      .select("id, submitted_at")
      .single();

    if (error) {
      if (/epro_daily_answers_unique|duplicate key/i.test(error.message)) {
        return NextResponse.json(
          { error: "Cuestionario completado por hoy.", completed: true },
          { status: 409 }
        );
      }
      throw error;
    }

    await recordEproMobileAudit({
      tableName: "epro_daily_answers",
      recordId: data.id as string,
      description: "El sujeto envió el cuestionario ePRO del día.",
      subjectCode: gate.session.subjectCode,
      metadata: {
        event_type: "epro_daily_submit",
        action: "INSERT",
        form_id: form.id,
        answered_on: answeredOn,
        submitted_at_utc: data.submitted_at,
        value: answers,
      },
    });

    const response = NextResponse.json({
      ok: true,
      completed: true,
      submitted_at: data.submitted_at,
    });
    if (gate.token) setEproCookie(response, gate.token);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    if (isMissingEproMobileSchema(message)) {
      return NextResponse.json({ error: `${message}. ${EPRO_MIGRATION_HINT}` }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
