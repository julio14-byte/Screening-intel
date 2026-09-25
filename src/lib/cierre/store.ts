import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { cierreSchemaErrorResponse } from "./http";
import {
  emptyScan,
  normalizeScan,
  type CloseoutPhase,
  type ProtocolCloseout,
} from "./model";

const CLOSEOUT_SELECT =
  "id, protocol_id, phase, lock_attestation, locked_at, locked_by, unblind_reason, unblinded_at, unblinded_by, analysis_snapshot, analyzed_at, analyzed_by, csr_markdown, csr_generated_at, agencies, submission_notes, submitted_at, submitted_by";

export async function loadProtocolInOrg(
  supabase: SupabaseClient,
  organizationId: string,
  protocolId: string
) {
  const { data, error } = await supabase
    .from("protocols")
    .select("id, title, code_name, clinic_id")
    .eq("id", protocolId)
    .eq("clinic_id", organizationId)
    .maybeSingle();
  if (error) return { error: cierreSchemaErrorResponse(error) };
  if (!data) {
    return {
      error: NextResponse.json({ error: "Protocolo fuera de tu centro." }, { status: 404 }),
    };
  }
  return { protocol: data };
}

export async function ensureCloseoutRow(
  supabase: SupabaseClient,
  organizationId: string,
  protocolId: string
) {
  const { data: existing, error: loadError } = await supabase
    .from("protocol_closeouts")
    .select(CLOSEOUT_SELECT)
    .eq("protocol_id", protocolId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (loadError) return { error: cierreSchemaErrorResponse(loadError) };
  if (existing) return { closeout: existing as ProtocolCloseout };

  const { data: created, error: insertError } = await supabase
    .from("protocol_closeouts")
    .insert({
      organization_id: organizationId,
      protocol_id: protocolId,
      phase: "cleaning",
    })
    .select(CLOSEOUT_SELECT)
    .maybeSingle();

  if (insertError) {
    const { data: raced } = await supabase
      .from("protocol_closeouts")
      .select(CLOSEOUT_SELECT)
      .eq("protocol_id", protocolId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (raced) return { closeout: raced as ProtocolCloseout };
    return { error: cierreSchemaErrorResponse(insertError) };
  }
  if (!created) {
    return {
      error: NextResponse.json({ error: "No se pudo iniciar el cierre." }, { status: 500 }),
    };
  }
  return { closeout: created as ProtocolCloseout };
}

export async function scanProtocol(
  supabase: SupabaseClient,
  protocolId: string
) {
  const { data, error } = await supabase.rpc("closeout_scan", {
    p_protocol_id: protocolId,
  });
  if (error) return { error: cierreSchemaErrorResponse(error), scan: emptyScan() };
  return { scan: normalizeScan(data) };
}

export function asPhase(value: unknown): CloseoutPhase {
  if (value === "locked") return "locked";
  if (value === "unblinded") return "unblinded";
  if (value === "analyzed") return "analyzed";
  if (value === "csr") return "csr";
  if (value === "submitted") return "submitted";
  return "cleaning";
}
