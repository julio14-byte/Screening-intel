import { NextResponse } from "next/server";
import { opsContext } from "@/lib/ops/http";
import {
  CONTACT_ATTEMPT_COLUMNS,
  CONTACT_MIGRATION_HINT,
  contactAttemptSchema,
} from "@/lib/candidato/contact-log";

function failure(error: { code?: string; message?: string }, fallback: string) {
  console.error("[candidatos/contactos]", error.code ?? "", error.message);
  const missing =
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    /schema cache|does not exist/i.test(error.message ?? "");
  return NextResponse.json(
    { error: missing ? CONTACT_MIGRATION_HINT : fallback },
    { status: 500 }
  );
}

export async function GET() {
  const gate = await opsContext(false);
  if (!gate.ok) return gate.response;

  const { data, error } = await gate.supabase
    .from("candidate_contact_attempts")
    .select(CONTACT_ATTEMPT_COLUMNS)
    .eq("organization_id", gate.organizationId)
    .order("attempted_at", { ascending: false })
    .limit(2000);
  if (error) return failure(error, "No se pudo cargar la bitácora de contacto.");

  return NextResponse.json({ attempts: data ?? [] });
}

export async function POST(request: Request) {
  const gate = await opsContext(true);
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = contactAttemptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
  }

  const { notes, next_attempt_on, ...rest } = parsed.data;
  const { data, error } = await gate.supabase
    .from("candidate_contact_attempts")
    .insert({
      organization_id: gate.organizationId,
      attempted_by: gate.ctx.user.id,
      notes: notes || null,
      next_attempt_on: next_attempt_on || null,
      ...rest,
    })
    .select(CONTACT_ATTEMPT_COLUMNS)
    .single();
  if (error) return failure(error, "No se pudo registrar el contacto.");

  return NextResponse.json({ attempt: data }, { status: 201 });
}
