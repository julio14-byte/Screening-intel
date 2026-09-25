import { NextResponse } from "next/server";
import { z } from "zod";
import { opsContext, opsSchemaErrorResponse } from "@/lib/ops/http";
import {
  FOLLOW_UP_MIGRATION_HINT,
  isMissingFollowUpSchema,
} from "@/lib/follow-up/model";

const createSchema = z.object({
  protocol_id: z.string().uuid(),
  arm_id: z.string().uuid().nullable().optional(),
  visit_code: z.string().trim().min(1).max(24),
  title: z.string().trim().min(1).max(120),
  target_day: z.number().int().min(0).max(3650),
  window_before_days: z.number().int().min(0).max(30).default(2),
  window_after_days: z.number().int().min(0).max(30).default(2),
  sort_order: z.number().int().min(0).max(999).optional(),
});

const patchSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(120).optional(),
  target_day: z.number().int().min(0).max(3650).optional(),
  window_before_days: z.number().int().min(0).max(30).optional(),
  window_after_days: z.number().int().min(0).max(30).optional(),
  sort_order: z.number().int().min(0).max(999).optional(),
  active: z.boolean().optional(),
});

function schemaError(error: { message?: string }) {
  if (isMissingFollowUpSchema(error.message)) {
    return NextResponse.json(
      { error: `${error.message}. ${FOLLOW_UP_MIGRATION_HINT}` },
      { status: 500 }
    );
  }
  return opsSchemaErrorResponse(error);
}

export async function GET(request: Request) {
  const gate = await opsContext(false);
  if (!gate.ok) return gate.response;

  const protocolId = new URL(request.url).searchParams.get("protocol_id");
  const parsed = z.string().uuid().safeParse(protocolId);
  if (!parsed.success) {
    return NextResponse.json({ error: "Protocolo inválido." }, { status: 400 });
  }

  const { data, error } = await gate.supabase
    .from("protocol_visit_schedules")
    .select(
      "id, protocol_id, arm_id, visit_code, title, target_day, window_before_days, window_after_days, sort_order, active, protocol_arms(code, name)"
    )
    .eq("organization_id", gate.organizationId)
    .eq("protocol_id", parsed.data)
    .order("sort_order", { ascending: true })
    .order("target_day", { ascending: true });

  if (error) return schemaError(error);
  return NextResponse.json({ schedules: data ?? [] });
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
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Calendario inválido." }, { status: 400 });
  }

  const { data: protocol, error: protocolError } = await gate.supabase
    .from("protocols")
    .select("id")
    .eq("id", parsed.data.protocol_id)
    .eq("clinic_id", gate.organizationId)
    .maybeSingle();
  if (protocolError) return schemaError(protocolError);
  if (!protocol) {
    return NextResponse.json({ error: "Protocolo fuera de tu centro." }, { status: 404 });
  }

  const { data, error } = await gate.supabase
    .from("protocol_visit_schedules")
    .insert({
      organization_id: gate.organizationId,
      protocol_id: parsed.data.protocol_id,
      arm_id: parsed.data.arm_id ?? null,
      visit_code: parsed.data.visit_code.trim().toUpperCase(),
      title: parsed.data.title.trim(),
      target_day: parsed.data.target_day,
      window_before_days: parsed.data.window_before_days,
      window_after_days: parsed.data.window_after_days,
      sort_order: parsed.data.sort_order ?? parsed.data.target_day,
    })
    .select("id")
    .single();

  if (error) return schemaError(error);
  return NextResponse.json({ schedule: data });
}

export async function PATCH(request: Request) {
  const gate = await opsContext(true);
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Calendario inválido." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.target_day !== undefined) patch.target_day = parsed.data.target_day;
  if (parsed.data.window_before_days !== undefined) {
    patch.window_before_days = parsed.data.window_before_days;
  }
  if (parsed.data.window_after_days !== undefined) {
    patch.window_after_days = parsed.data.window_after_days;
  }
  if (parsed.data.sort_order !== undefined) patch.sort_order = parsed.data.sort_order;
  if (parsed.data.active !== undefined) patch.active = parsed.data.active;

  const { data, error } = await gate.supabase
    .from("protocol_visit_schedules")
    .update(patch)
    .eq("id", parsed.data.id)
    .eq("organization_id", gate.organizationId)
    .select("id")
    .maybeSingle();

  if (error) return schemaError(error);
  if (!data) {
    return NextResponse.json({ error: "Visita del calendario no encontrada." }, { status: 404 });
  }
  return NextResponse.json({ schedule: data });
}
