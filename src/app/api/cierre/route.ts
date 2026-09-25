import { NextResponse } from "next/server";
import { z } from "zod";
import { cierreContext, cierreSchemaErrorResponse } from "@/lib/cierre/http";
import { asPhase, loadProtocolInOrg, scanProtocol } from "@/lib/cierre/store";
import type { ProtocolCloseout } from "@/lib/cierre/model";

const CLOSEOUT_SELECT =
  "id, protocol_id, phase, lock_attestation, locked_at, unblind_reason, unblinded_at, analysis_snapshot, analyzed_at, csr_markdown, csr_generated_at, agencies, submission_notes, submitted_at";

export async function GET(request: Request) {
  const gate = await cierreContext();
  if (!gate.ok) return gate.response;

  const protocolId = new URL(request.url).searchParams.get("protocol_id");
  if (!protocolId) {
    const { data: protocols, error: protocolError } = await gate.supabase
      .from("protocols")
      .select("id, title, code_name, status")
      .eq("clinic_id", gate.organizationId)
      .order("created_at", { ascending: false });
    if (protocolError) return cierreSchemaErrorResponse(protocolError);

    const { data: closeouts, error: closeoutError } = await gate.supabase
      .from("protocol_closeouts")
      .select("protocol_id, phase, locked_at, unblinded_at, submitted_at")
      .eq("organization_id", gate.organizationId);
    if (closeoutError) return cierreSchemaErrorResponse(closeoutError);

    const byProtocol = new Map(
      (closeouts ?? []).map((row) => [row.protocol_id as string, row])
    );

    return NextResponse.json({
      protocols: (protocols ?? []).map((protocol) => {
        const closeout = byProtocol.get(protocol.id as string);
        return {
          id: protocol.id,
          title: protocol.title,
          code_name: protocol.code_name,
          status: protocol.status,
          phase: asPhase(closeout?.phase),
          locked_at: closeout?.locked_at ?? null,
          unblinded_at: closeout?.unblinded_at ?? null,
          submitted_at: closeout?.submitted_at ?? null,
        };
      }),
    });
  }

  const parsed = z.string().uuid().safeParse(protocolId);
  if (!parsed.success) {
    return NextResponse.json({ error: "Protocolo inválido." }, { status: 400 });
  }

  const loaded = await loadProtocolInOrg(gate.supabase, gate.organizationId, parsed.data);
  if (loaded.error) return loaded.error;

  const { data: closeout, error: closeoutError } = await gate.supabase
    .from("protocol_closeouts")
    .select(CLOSEOUT_SELECT)
    .eq("protocol_id", parsed.data)
    .eq("organization_id", gate.organizationId)
    .maybeSingle();
  if (closeoutError) return cierreSchemaErrorResponse(closeoutError);

  const { data: queries, error: queryError } = await gate.supabase
    .from("closeout_queries")
    .select(
      "id, protocol_id, patient_id, follow_up_visit_id, field_hint, description, status, answer_notes, opened_at, patients(subject_code)"
    )
    .eq("protocol_id", parsed.data)
    .eq("organization_id", gate.organizationId)
    .order("opened_at", { ascending: false })
    .limit(100);
  if (queryError) return cierreSchemaErrorResponse(queryError);

  const scanned = await scanProtocol(gate.supabase, parsed.data);
  if (scanned.error) return scanned.error;

  return NextResponse.json({
    protocol: loaded.protocol,
    closeout: (closeout as ProtocolCloseout | null) ?? {
      id: null,
      protocol_id: parsed.data,
      phase: "cleaning",
      lock_attestation: "",
      locked_at: null,
      unblind_reason: "",
      unblinded_at: null,
      analysis_snapshot: {},
      analyzed_at: null,
      csr_markdown: "",
      csr_generated_at: null,
      agencies: [],
      submission_notes: "",
      submitted_at: null,
    },
    scan: scanned.scan,
    queries: queries ?? [],
    role: gate.role,
  });
}
