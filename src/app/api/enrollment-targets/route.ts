import { NextResponse } from "next/server";
import { opsContext } from "@/lib/ops/http";
import {
  ENROLLMENT_MIGRATION_HINT,
  ENROLLMENT_TARGET_COLUMNS,
  enrollmentTargetSchema,
} from "@/lib/enrollment/targets";

function schemaMissing(error: { code?: string; message?: string }) {
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    /schema cache|does not exist/i.test(error.message ?? "")
  );
}

function failure(error: { code?: string; message?: string }, fallback: string) {
  console.error("[enrollment-targets]", error.code ?? "", error.message);
  return NextResponse.json(
    { error: schemaMissing(error) ? ENROLLMENT_MIGRATION_HINT : fallback },
    { status: 500 }
  );
}

export async function GET() {
  const gate = await opsContext(false);
  if (!gate.ok) return gate.response;

  const { data, error } = await gate.supabase
    .from("protocol_enrollment_targets")
    .select(ENROLLMENT_TARGET_COLUMNS)
    .eq("organization_id", gate.organizationId);
  if (error) return failure(error, "No se pudieron cargar las metas.");

  return NextResponse.json({ targets: data ?? [] });
}

export async function PUT(request: Request) {
  const gate = await opsContext(true);
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = enrollmentTargetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
  }

  const { data, error } = await gate.supabase
    .from("protocol_enrollment_targets")
    .upsert(
      { organization_id: gate.organizationId, ...parsed.data },
      { onConflict: "protocol_id" }
    )
    .select(ENROLLMENT_TARGET_COLUMNS)
    .single();
  if (error) return failure(error, "No se pudo guardar la meta.");

  return NextResponse.json({ target: data });
}

export async function DELETE(request: Request) {
  const gate = await opsContext(true);
  if (!gate.ok) return gate.response;

  const protocolId = new URL(request.url).searchParams.get("protocol_id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(protocolId)) {
    return NextResponse.json({ error: "Protocolo inválido." }, { status: 400 });
  }

  const { error } = await gate.supabase
    .from("protocol_enrollment_targets")
    .delete()
    .eq("organization_id", gate.organizationId)
    .eq("protocol_id", protocolId);
  if (error) return failure(error, "No se pudo quitar la meta.");

  return NextResponse.json({ ok: true });
}
