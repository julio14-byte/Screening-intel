import { NextResponse } from "next/server";
import { opsContext } from "@/lib/ops/http";
import {
  DELEGATION_COLUMNS,
  STAFF_COLUMNS,
  TEAM_MIGRATION_HINT,
} from "@/lib/team/team";

export async function GET() {
  const gate = await opsContext(false);
  if (!gate.ok) return gate.response;

  const [staff, delegations] = await Promise.all([
    gate.supabase
      .from("site_staff")
      .select(STAFF_COLUMNS)
      .eq("organization_id", gate.organizationId)
      .order("full_name"),
    gate.supabase
      .from("delegation_assignments")
      .select(DELEGATION_COLUMNS)
      .eq("organization_id", gate.organizationId)
      .order("delegated_on", { ascending: false })
      .limit(2000),
  ]);

  const error = staff.error ?? delegations.error;
  if (error) {
    console.error("[team] read:", error.code ?? "", error.message);
    const missing =
      error.code === "PGRST205" ||
      error.code === "42P01" ||
      /schema cache|does not exist/i.test(error.message ?? "");
    return NextResponse.json(
      { error: missing ? TEAM_MIGRATION_HINT : "No se pudo cargar el equipo." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    staff: staff.data ?? [],
    delegations: delegations.data ?? [],
  });
}
