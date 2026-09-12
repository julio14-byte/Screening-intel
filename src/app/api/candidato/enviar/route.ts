import { NextResponse } from "next/server";
import { candidatoPaths } from "@/lib/candidato/paths";
import {
  checkPublicRateLimit,
  clientIpFromRequest,
} from "@/lib/candidato/rate-limit";
import { generateReferralCode } from "@/lib/candidato/referral";
import {
  candidatoSubmitSchema,
  type IntakeMatchSummary,
} from "@/lib/candidato/schemas";
import { extractClinicalProfileFromNotes } from "@/lib/profile/extractClinicalProfileFromNotes";
import { evaluatePatientIntake } from "@/lib/matching";
import { getServiceSupabase } from "@/lib/screening-services";
import type { ClinicalProfile, Gender, Patient, Protocol } from "@/lib/types";

function parseListFromText(text: string): string[] {
  return text
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function intakeMessage(verdict: string): string {
  if (verdict === "eligible") {
    return "Según lo que nos contaste, podrías ser candidato. Un coordinador te contactará.";
  }
  if (verdict === "excluded") {
    return "Por lo que indicaste, este estudio probablemente no es para ti. Un coordinador puede revisar tu caso.";
  }
  return "Necesitamos hablar contigo para confirmar algunos puntos. Un coordinador te contactará.";
}

export async function POST(request: Request) {
  const ip = clientIpFromRequest(request);
  const limited = checkPublicRateLimit(`candidato:ip:${ip}`, 5, 3600);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Demasiados envíos. Intenta más tarde." },
      {
        status: 429,
        headers: {
          "Retry-After": String(limited.retryAfterSec ?? 3600),
        },
      }
    );
  }

  let supabase;
  try {
    supabase = getServiceSupabase();
  } catch (e) {
    return NextResponse.json(
      {
        error:
          "El servidor no está configurado para recibir candidatos. Falta SUPABASE_SERVICE_ROLE_KEY en Vercel.",
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = candidatoSubmitSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ");
    return NextResponse.json({ error: msg || "Datos inválidos." }, { status: 400 });
  }

  const data = parsed.data;

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, slug, portal_enabled")
    .eq("slug", data.orgSlug.toLowerCase())
    .maybeSingle();

  if (orgError || !org) {
    return NextResponse.json({ error: "Centro no encontrado." }, { status: 404 });
  }

  if (!org.portal_enabled) {
    return NextResponse.json(
      { error: "Portal no activo para este centro." },
      { status: 403 }
    );
  }

  let conditions = data.conditions;
  let medications = data.medications;
  const laboratories: Record<string, number> = {};

  if (data.raw_notes?.trim()) {
    try {
      const extracted = await extractClinicalProfileFromNotes(data.raw_notes);
      conditions = [...new Set([...conditions, ...extracted.conditions])];
      medications = [...new Set([...medications, ...extracted.medications])];
    } catch {
      /* texto libre opcional; continuar con listas del formulario */
    }
  }

  const stubPatient: Patient = {
    id: "00000000-0000-0000-0000-000000000000",
    clinic_id: org.id,
    first_name: data.first_name,
    last_name: data.last_name,
    birth_date: data.birth_date,
    gender: data.gender as Gender,
    created_at: new Date().toISOString(),
  };

  const profile: ClinicalProfile | null =
    conditions.length || medications.length
      ? {
          id: "00000000-0000-0000-0000-000000000000",
          patient_id: stubPatient.id,
          conditions,
          medications,
          laboratories,
          updated_at: new Date().toISOString(),
        }
      : null;

  const { data: protocolRows } = await supabase
    .from("protocols")
    .select("*")
    .eq("clinic_id", org.id)
    .eq("status", "active");

  let targets: Protocol[] = (protocolRows ?? []) as Protocol[];

  if (data.protocolCode) {
    targets = targets.filter(
      (p) => p.code_name.toLowerCase() === data.protocolCode!.toLowerCase()
    );
    if (!targets.length) {
      return NextResponse.json({ error: "Estudio no encontrado." }, { status: 404 });
    }
  }

  const matchResults: IntakeMatchSummary[] = targets.map((protocol) => {
    const result = evaluatePatientIntake(stubPatient, profile, protocol);
    return {
      protocol_id: protocol.id,
      protocol_code: protocol.code_name,
      protocol_title: protocol.title,
      verdict: result.verdict,
      score: result.score,
    };
  });

  const sortedMatches = [...matchResults].sort((a, b) => {
    const order = { eligible: 0, pending: 1, excluded: 2 };
    return order[a.verdict] - order[b.verdict] || b.score - a.score;
  });

  const primaryMatch = sortedMatches[0];
  const primaryProtocol = primaryMatch
    ? targets.find((p) => p.id === primaryMatch.protocol_id)
    : undefined;

  const primaryVerdict = primaryMatch?.verdict ?? "pending";

  const referralCode = generateReferralCode();

  const { error: insertError } = await supabase.from("pre_screen_submissions").insert({
    organization_id: org.id,
    protocol_id: primaryProtocol?.id ?? null,
    referral_code: referralCode,
    first_name: data.first_name,
    last_name: data.last_name,
    birth_date: data.birth_date,
    gender: data.gender,
    contact_email: data.contact_email || null,
    contact_phone: data.contact_phone || null,
    raw_notes: data.raw_notes || null,
    extracted_profile: {
      conditions,
      medications,
      laboratories,
    },
    match_results: matchResults,
    consent_at: new Date().toISOString(),
  });

  if (insertError) {
    console.error("[candidato/enviar]", insertError.message);
    return NextResponse.json({ error: "No se pudo guardar el envío." }, { status: 500 });
  }

  return NextResponse.json({
    referralCode,
    message: intakeMessage(primaryVerdict),
    verdict: primaryVerdict,
    graciasUrl: candidatoPaths.gracias(referralCode),
  });
}
