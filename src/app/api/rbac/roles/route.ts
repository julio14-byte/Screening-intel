import { NextResponse } from "next/server";
import { serverError } from "@/lib/security/http";
import { createClient } from "@/lib/supabase/server";
import {
  getUserAppRole,
  listOrganizationMembersWithRoles,
} from "@/lib/rbac/get-user-role";
import {
  AuthorizationError,
  requirePermission,
} from "@/lib/rbac/require-permission";
import { z } from "zod";

const bodySchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["investigator", "sub_investigator", "coordinator", "monitor"]),
});

export async function GET() {
  try {
    const { user } = await requirePermission("roles:manage");
    const members = await listOrganizationMembersWithRoles(user.id);
    const role = await getUserAppRole(user.id);
    return NextResponse.json({ members, currentRole: role });
  } catch (e) {
    if (e instanceof AuthorizationError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await requirePermission("roles:manage");

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Campos requeridos: userId (uuid), role válido." },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const supabase = await createClient();
    const { error } = await supabase.rpc("assign_user_clinical_role", {
      p_user_id: body.userId,
      p_role: body.role,
    });

    if (error) {
      return serverError("rbac/roles", error, "No se pudo asignar el rol.", 400);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthorizationError) {
      const status = e.code === "UNAUTHENTICATED" ? 401 : 403;
      return NextResponse.json({ error: e.message }, { status });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
