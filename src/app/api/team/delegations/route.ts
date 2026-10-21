import { NextResponse } from "next/server";
import { opsContext } from "@/lib/ops/http";
import { AuthorizationError, requirePermission } from "@/lib/rbac/require-permission";
import {
  DELEGATION_COLUMNS,
  delegationSchema,
  endDelegationSchema,
  TEAM_MIGRATION_HINT,
} from "@/lib/team/team";

async function guard() {
  try {
    await requirePermission("roles:manage");
  } catch (e) {
    if (e instanceof AuthorizationError) {
      return NextResponse.json(
        { error: e.message },
        { status: e.code === "UNAUTHENTICATED" ? 401 : 403 }
      );
    }
    throw e;
  }
  return null;
}

function failure(error: { code?: string; message?: string }, fallback: string) {
  console.error("[team] delegations:", error.code ?? "", error.message);
  const missing = error.code === "PGRST205" || error.code === "42P01";
  return NextResponse.json(
    { error: missing ? TEAM_MIGRATION_HINT : fallback },
    { status: 500 }
  );
}

async function readBody(request: Request) {
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
  const denied = await guard();
  if (denied) return denied;
  const gate = await opsContext(false);
  if (!gate.ok) return gate.response;
  const read = await readBody(request);
  if (!read.ok) return read.response;

  const parsed = delegationSchema.safeParse(read.body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
  }

  const { data, error } = await gate.supabase
    .from("delegation_assignments")
    .insert({
      organization_id: gate.organizationId,
      delegated_by: gate.ctx.user.id,
      ...parsed.data,
    })
    .select(DELEGATION_COLUMNS)
    .single();
  if (error) return failure(error, "No se pudo registrar la delegación.");

  return NextResponse.json({ delegation: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  const gate = await opsContext(false);
  if (!gate.ok) return gate.response;
  const read = await readBody(request);
  if (!read.ok) return read.response;

  const parsed = endDelegationSchema.safeParse(read.body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
  }

  const { data, error } = await gate.supabase
    .from("delegation_assignments")
    .update({ ended_on: parsed.data.ended_on })
    .eq("id", parsed.data.id)
    .eq("organization_id", gate.organizationId)
    .select(DELEGATION_COLUMNS)
    .maybeSingle();
  if (error) return failure(error, "No se pudo cerrar la delegación.");
  if (!data) {
    return NextResponse.json({ error: "Delegación no encontrada." }, { status: 404 });
  }

  return NextResponse.json({ delegation: data });
}
