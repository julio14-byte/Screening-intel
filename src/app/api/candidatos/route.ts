import { NextResponse } from "next/server";
import { serverError } from "@/lib/security/http";
import {
  AuthorizationError,
  requirePermission,
} from "@/lib/rbac/require-permission";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    await requirePermission("patients:read");
  } catch (e) {
    if (e instanceof AuthorizationError) {
      const status = e.code === "UNAUTHENTICATED" ? 401 : 403;
      return NextResponse.json({ error: e.message }, { status });
    }
    throw e;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pre_screen_submissions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return serverError("candidatos", error);
  }

  return NextResponse.json({ submissions: data ?? [] });
}
