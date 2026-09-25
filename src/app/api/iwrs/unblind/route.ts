import { NextResponse } from "next/server";
import { z } from "zod";
import { recordCustomAuditEvent } from "@/lib/audit/record-audit-event";
import { iwrsContext } from "@/lib/iwrs/http";

const schema = z.object({
  randomization_id: z.string().uuid(),
  reason: z.string().trim().min(8).max(500),
});

export async function POST(request: Request) {
  const gate = await iwrsContext("screenings:approve");
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Indicá el motivo clínico del desenlace (mínimo 8 caracteres)." },
      { status: 400 }
    );
  }

  const { data: assignment } = await gate.supabase
    .from("iwrs_randomizations")
    .select("id, patient_id")
    .eq("id", parsed.data.randomization_id)
    .maybeSingle();

  const { data, error } = await gate.supabase.rpc("iwrs_unblind", {
    p_randomization_id: parsed.data.randomization_id,
    p_reason: parsed.data.reason,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  try {
    await recordCustomAuditEvent({
      tableName: "patients",
      recordId: assignment?.patient_id ?? parsed.data.randomization_id,
      description: "Desenlace de emergencia IWRS.",
      metadata: {
        event_type: "iwrs_unblind",
        randomization_id: parsed.data.randomization_id,
        reason: parsed.data.reason,
      },
    });
  } catch {
    /* bitácora no bloquea */
  }

  return NextResponse.json({ unblind: data });
}
