import { NextResponse } from "next/server";
import {
  AuthorizationError,
  requirePermission,
} from "@/lib/rbac/require-permission";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("patients:write");
  } catch (e) {
    if (e instanceof AuthorizationError) {
      const status = e.code === "UNAUTHENTICATED" ? 401 : 403;
      return NextResponse.json({ error: e.message }, { status });
    }
    throw e;
  }

  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase
    .from("pre_screen_submissions")
    .update({ status: "archived" })
    .eq("id", id)
    .neq("status", "converted");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
