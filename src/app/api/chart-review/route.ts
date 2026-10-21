import { NextResponse } from "next/server";
import { opsContext } from "@/lib/ops/http";
import { CHART_REVIEW_MIGRATION_HINT, REVIEW_COLUMNS } from "@/lib/chart-review/review";
import { MEDICATION_COLUMNS } from "@/lib/chart-review/medications";

const UUID = /^[0-9a-f-]{36}$/i;

export async function GET(request: Request) {
  const gate = await opsContext(false);
  if (!gate.ok) return gate.response;

  const params = new URL(request.url).searchParams;
  const patientId = params.get("patient_id") ?? "";
  const protocolId = params.get("protocol_id") ?? "";
  if (!UUID.test(patientId) || !UUID.test(protocolId)) {
    return NextResponse.json({ error: "Paciente o protocolo inválido." }, { status: 400 });
  }

  const [reviews, medications] = await Promise.all([
    gate.supabase
      .from("criterion_reviews")
      .select(REVIEW_COLUMNS)
      .eq("organization_id", gate.organizationId)
      .eq("patient_id", patientId)
      .eq("protocol_id", protocolId)
      .order("reviewed_at", { ascending: false })
      .limit(500),
    gate.supabase
      .from("patient_medications")
      .select(MEDICATION_COLUMNS)
      .eq("organization_id", gate.organizationId)
      .eq("patient_id", patientId)
      .order("started_on", { ascending: false, nullsFirst: false })
      .limit(200),
  ]);

  const error = reviews.error ?? medications.error;
  if (error) {
    console.error("[chart-review] read:", error.code ?? "", error.message);
    const missing =
      error.code === "PGRST205" ||
      error.code === "42P01" ||
      /schema cache|does not exist/i.test(error.message ?? "");
    return NextResponse.json(
      { error: missing ? CHART_REVIEW_MIGRATION_HINT : "No se pudo cargar la revisión." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    reviews: reviews.data ?? [],
    medications: medications.data ?? [],
  });
}
