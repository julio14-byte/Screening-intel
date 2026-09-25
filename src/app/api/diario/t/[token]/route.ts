import { NextResponse } from "next/server";
import { z } from "zod";
import {
  checkPublicRateLimit,
  clientIpFromRequest,
} from "@/lib/candidato/rate-limit";
import {
  DIARY_MIGRATION_HINT,
  hashDiaryToken,
  isMissingDispenseSchema,
} from "@/lib/pharmacy/dispense";
import { getServiceSupabase } from "@/lib/screening-services";

type RouteContext = { params: Promise<{ token: string }> };

const submitSchema = z.object({
  taken: z.boolean(),
  taken_at: z.string().optional(),
  symptoms: z.string().trim().max(500).optional().default(""),
  severity: z.number().int().min(0).max(10).optional().default(0),
  diary_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

async function loadLink(token: string) {
  const supabase = getServiceSupabase();
  const hash = hashDiaryToken(token);
  const { data, error } = await supabase
    .from("dosing_diary_links")
    .select(
      "id, organization_id, patient_id, protocol_id, expires_at, revoked_at, patients(first_name), protocols(code_name, title)"
    )
    .eq("token_hash", hash)
    .maybeSingle();
  if (error) throw error;
  return { supabase, link: data };
}

function firstRel<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function GET(request: Request, context: RouteContext) {
  const ip = clientIpFromRequest(request);
  const limited = checkPublicRateLimit(`diario:get:${ip}`, 60, 3600);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Demasiadas consultas. Intentá más tarde." },
      { status: 429 }
    );
  }

  const { token } = await context.params;
  if (!token || token.length < 16) {
    return NextResponse.json({ error: "Link inválido." }, { status: 404 });
  }

  try {
    const { supabase, link } = await loadLink(token);
    if (!link || link.revoked_at) {
      return NextResponse.json({ error: "Este diario ya no está activo." }, { status: 404 });
    }
    if (new Date(link.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "El link del diario venció. Pedile uno nuevo al centro." },
        { status: 410 }
      );
    }

    const { data: last } = await supabase
      .from("dosing_diary_entries")
      .select("diary_on, taken, symptoms, severity")
      .eq("patient_id", link.patient_id)
      .eq("protocol_id", link.protocol_id)
      .order("diary_on", { ascending: false })
      .limit(7);

    const patient = firstRel(link.patients);
    const protocol = firstRel(link.protocols);
    return NextResponse.json({
      first_name: patient?.first_name ?? "Hola",
      protocol_code: protocol?.code_name ?? "Estudio",
      protocol_title: protocol?.title ?? "",
      recent: last ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    if (isMissingDispenseSchema(message) || /not configured|SERVICE_ROLE/i.test(message)) {
      return NextResponse.json(
        { error: `${message}. ${DIARY_MIGRATION_HINT}` },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const ip = clientIpFromRequest(request);
  const limited = checkPublicRateLimit(`diario:ip:${ip}`, 20, 3600);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Demasiados envíos. Intentá más tarde." },
      { status: 429 }
    );
  }

  const { token } = await context.params;
  if (!token || token.length < 16) {
    return NextResponse.json({ error: "Link inválido." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Completá si tomaste la medicación y la hora." },
      { status: 400 }
    );
  }

  try {
    const { supabase, link } = await loadLink(token);
    if (!link || link.revoked_at) {
      return NextResponse.json({ error: "Este diario ya no está activo." }, { status: 404 });
    }
    if (new Date(link.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "El link del diario venció." }, { status: 410 });
    }

    const diaryOn =
      parsed.data.diary_on ?? new Date().toISOString().slice(0, 10);
    const takenAt = parsed.data.taken
      ? parsed.data.taken_at || new Date().toISOString()
      : null;

    const { error } = await supabase.from("dosing_diary_entries").upsert(
      {
        organization_id: link.organization_id,
        patient_id: link.patient_id,
        protocol_id: link.protocol_id,
        diary_on: diaryOn,
        taken_at: takenAt,
        taken: parsed.data.taken,
        symptoms: parsed.data.symptoms ?? "",
        source: "patient",
        severity: parsed.data.severity ?? 0,
      },
      { onConflict: "patient_id,protocol_id,diary_on" }
    );
    if (error) throw error;

    return NextResponse.json({ ok: true, diary_on: diaryOn });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    if (isMissingDispenseSchema(message)) {
      return NextResponse.json(
        { error: `${message}. ${DIARY_MIGRATION_HINT}` },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
