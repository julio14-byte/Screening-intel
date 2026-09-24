import { NextResponse } from "next/server";
import { z } from "zod";
import { opsContext, opsSchemaErrorResponse } from "@/lib/ops/http";

const patchSchema = z.object({
  id: z.string().uuid().optional(),
  all: z.boolean().optional(),
});

export async function GET() {
  const gate = await opsContext(false);
  if (!gate.ok) return gate.response;

  const { data: notes, error } = await gate.supabase
    .from("app_notifications")
    .select("id, kind, title, body, href, created_at")
    .eq("organization_id", gate.organizationId)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    return opsSchemaErrorResponse(error);
  }

  const ids = (notes ?? []).map((note) => note.id);
  const readIds = new Set<string>();
  if (ids.length > 0) {
    const { data: reads, error: readError } = await gate.supabase
      .from("notification_reads")
      .select("notification_id")
      .eq("user_id", gate.ctx.user.id)
      .in("notification_id", ids);
    if (readError) {
      return opsSchemaErrorResponse(readError);
    }
    for (const row of reads ?? []) readIds.add(row.notification_id);
  }

  const items = (notes ?? []).map((note) => ({
    ...note,
    read: readIds.has(note.id),
  }));

  return NextResponse.json({
    items,
    unread: items.filter((item) => !item.read).length,
  });
}

export async function PATCH(request: Request) {
  const gate = await opsContext(false);
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success || (!parsed.data.id && !parsed.data.all)) {
    return NextResponse.json({ error: "Indica un aviso o all: true." }, { status: 400 });
  }

  let ids: string[] = [];
  if (parsed.data.all) {
    const { data, error } = await gate.supabase
      .from("app_notifications")
      .select("id")
      .eq("organization_id", gate.organizationId)
      .limit(40);
    if (error) return opsSchemaErrorResponse(error);
    ids = (data ?? []).map((row) => row.id);
  } else if (parsed.data.id) {
    ids = [parsed.data.id];
  }

  if (ids.length === 0) return NextResponse.json({ ok: true });

  const rows = ids.map((id) => ({
    notification_id: id,
    user_id: gate.ctx.user.id,
  }));

  const { error } = await gate.supabase
    .from("notification_reads")
    .upsert(rows, { onConflict: "notification_id,user_id", ignoreDuplicates: true });

  if (error) {
    return opsSchemaErrorResponse(error);
  }

  return NextResponse.json({ ok: true });
}
