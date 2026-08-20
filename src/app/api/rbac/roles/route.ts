import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getUserAppRole,
  listOrganizationMembersWithRoles,
} from "@/lib/rbac/get-user-role";
import {
  AuthorizationError,
  requirePermission,
} from "@/lib/rbac/require-permission";
import type { AppRole } from "@/lib/rbac/types";

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

    const body = (await request.json()) as {
      userId?: string;
      role?: AppRole;
    };

    if (!body.userId || !body.role) {
      return NextResponse.json(
        { error: "Campos requeridos: userId, role" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("assign_user_clinical_role", {
      p_user_id: body.userId,
      p_role: body.role,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
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
