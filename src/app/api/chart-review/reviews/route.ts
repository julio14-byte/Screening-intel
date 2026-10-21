import { NextResponse } from "next/server";
import { opsContext } from "@/lib/ops/http";
import {
  CHART_REVIEW_MIGRATION_HINT,
  REVIEW_COLUMNS,
  reviewInputSchema,
} from "@/lib/chart-review/review";

export async function POST(request: Request) {
  const gate = await opsContext(true);
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = reviewInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
  }

  const v = parsed.data;
  const { data, error } = await gate.supabase
    .from("criterion_reviews")
    .insert({
      organization_id: gate.organizationId,
      patient_id: v.patient_id,
      protocol_id: v.protocol_id,
      criterion: v.criterion,
      criterion_type: v.criterion_type,
      engine_status: v.engine_status,
      engine_evidence: v.engine_evidence,
      decision: v.decision,
      source_type: v.source_type ?? null,
      source_ref: v.source_ref || null,
      observed_on: v.observed_on || null,
      source_value: v.source_value || null,
      note: v.note || null,
    })
    .select(REVIEW_COLUMNS)
    .single();

  if (error) {
    console.error("[chart-review] insert:", error.code ?? "", error.message);
    const missing = error.code === "PGRST205" || error.code === "42P01";
    return NextResponse.json(
      { error: missing ? CHART_REVIEW_MIGRATION_HINT : "No se pudo registrar la revisión." },
      { status: 500 }
    );
  }

  return NextResponse.json({ review: data }, { status: 201 });
}
