import { NextResponse } from "next/server";
import { z } from "zod";
import { opsContext } from "@/lib/ops/http";
import { TASK_STATUSES } from "@/lib/ops/model";
import { syncCoordinatorWork } from "@/lib/ops/syncCoordinatorWork";

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(TASK_STATUSES).optional(),
  take: z.boolean().optional(),
});

export async function GET() {
  const gate = await opsContext(false);
  if (!gate.ok) return gate.response;

  const { data, error } = await gate.supabase
    .from("coordinator_tasks")
    .select(
      "id, kind, source_id, title, detail, initials, href, status, due_at, assignee_id, updated_at"
    )
    .eq("organization_id", gate.organizationId)
    .order("due_at", { ascending: true })
    .limit(80);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tasks: data ?? [] });
}

export async function POST() {
  const gate = await opsContext(true);
  if (!gate.ok) return gate.response;

  try {
    const summary = await syncCoordinatorWork(gate.supabase, gate.organizationId);
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo sincronizar la cola.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
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
    return NextResponse.json({ error: "Datos de tarea inválidos." }, { status: 400 });
  }

  const patch: { status?: string; assignee_id?: string | null } = {};
  if (parsed.data.take) {
    patch.assignee_id = gate.ctx.user.id;
    patch.status = "in_progress";
  }
  if (parsed.data.status) {
    patch.status = parsed.data.status;
    if (parsed.data.status === "pending") patch.assignee_id = null;
  }

  if (!patch.status && !parsed.data.take) {
    return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });
  }

  const { data, error } = await gate.supabase
    .from("coordinator_tasks")
    .update(patch)
    .eq("id", parsed.data.id)
    .eq("organization_id", gate.organizationId)
    .select("id, status, assignee_id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Tarea no encontrada." }, { status: 404 });
  }

  return NextResponse.json({ task: data });
}
