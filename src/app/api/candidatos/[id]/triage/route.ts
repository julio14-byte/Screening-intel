import { NextResponse } from "next/server";
import { generateCandidatoTriage } from "@/lib/candidato/generateTriage";
import {
  AuthorizationError,
  requirePermission,
} from "@/lib/rbac/require-permission";
import { createClient } from "@/lib/supabase/server";
import type { Gender } from "@/lib/types";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ExtractedProfile = {
  conditions?: string[];
  medications?: string[];
  laboratories?: Record<string, number>;
};

type MatchRow = {
  protocol_code?: string;
  protocol_title?: string;
  verdict?: string;
  score?: number;
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("patients:read");
  } catch (e) {
    if (e instanceof AuthorizationError) {
      const status = e.code === "UNAUTHENTICATED" ? 401 : 403;
      return NextResponse.json({ error: e.message }, { status });
    }
    throw e;
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: submission, error } = await supabase
    .from("pre_screen_submissions")
    .select(
      "first_name, last_name, birth_date, gender, raw_notes, extracted_profile, match_results"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!submission) {
    return NextResponse.json({ error: "Candidato no encontrado." }, { status: 404 });
  }

  const profile = (submission.extracted_profile ?? {}) as ExtractedProfile;
  const matches = Array.isArray(submission.match_results)
    ? (submission.match_results as MatchRow[])
        .filter((m) => typeof m.protocol_code === "string")
        .map((m) => ({
          protocol_code: m.protocol_code as string,
          protocol_title:
            typeof m.protocol_title === "string" ? m.protocol_title : undefined,
          verdict: typeof m.verdict === "string" ? m.verdict : "pending",
          score: typeof m.score === "number" ? m.score : 0,
        }))
    : [];

  try {
    const triage = await generateCandidatoTriage({
      first_name: submission.first_name as string,
      last_name: submission.last_name as string,
      birth_date: String(submission.birth_date).slice(0, 10),
      gender: submission.gender as Gender,
      conditions: profile.conditions ?? [],
      medications: profile.medications ?? [],
      laboratories: profile.laboratories,
      raw_notes: (submission.raw_notes as string | null) ?? null,
      matches,
    });
    return NextResponse.json({ triage });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Error al generar el triage.",
      },
      { status: 500 }
    );
  }
}
