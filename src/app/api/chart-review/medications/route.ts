import { NextResponse } from "next/server";
import { opsContext } from "@/lib/ops/http";
import { CHART_REVIEW_MIGRATION_HINT } from "@/lib/chart-review/review";
import {
  MEDICATION_COLUMNS,
  medicationInputSchema,
  medicationUpdateSchema,
} from "@/lib/chart-review/medications";

function failure(error: { code?: string; message?: string }, fallback: string) {
  console.error("[chart-review] medications:", error.code ?? "", error.message);
  const missing = error.code === "PGRST205" || error.code === "42P01";
  return NextResponse.json(
    { error: missing ? CHART_REVIEW_MIGRATION_HINT : fallback },
    { status: 500 }
  );
}

async function readJson(request: Request) {
  try {
    return { ok: true as const, body: (await request.json()) as unknown };
  } catch {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "JSON inválido." }, { status: 400 }),
    };
  }
}

export async function POST(request: Request) {
  const gate = await opsContext(true);
  if (!gate.ok) return gate.response;
  const read = await readJson(request);
  if (!read.ok) return read.response;

  const parsed = medicationInputSchema.safeParse(read.body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
  }
  const v = parsed.data;
  const { data, error } = await gate.supabase
    .from("patient_medications")
    .insert({
      organization_id: gate.organizationId,
      patient_id: v.patient_id,
      drug_name: v.drug_name,
      dose: v.dose || null,
      started_on: v.started_on || null,
      ended_on: v.ended_on || null,
      source_type: v.source_type,
      source_ref: v.source_ref || null,
      verified_on: v.verified_on || null,
    })
    .select(MEDICATION_COLUMNS)
    .single();
  if (error) return failure(error, "No se pudo registrar el medicamento.");

  return NextResponse.json({ medication: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const gate = await opsContext(true);
  if (!gate.ok) return gate.response;
  const read = await readJson(request);
  if (!read.ok) return read.response;

  const parsed = medicationUpdateSchema.safeParse(read.body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
  }

  const { id, ...patch } = parsed.data;
  const values = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined)
  );
  if (Object.keys(values).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });
  }

  const { data, error } = await gate.supabase
    .from("patient_medications")
    .update(values)
    .eq("id", id)
    .eq("organization_id", gate.organizationId)
    .select(MEDICATION_COLUMNS)
    .maybeSingle();
  if (error) return failure(error, "No se pudo actualizar el medicamento.");
  if (!data) {
    return NextResponse.json({ error: "Medicamento no encontrado." }, { status: 404 });
  }

  return NextResponse.json({ medication: data });
}
