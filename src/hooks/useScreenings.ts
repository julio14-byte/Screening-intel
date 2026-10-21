"use client";

import { useCallback, useEffect, useState } from "react";
import { useRole } from "@/contexts/role-context";
import { useSupabaseReady } from "@/hooks/useSupabaseReady";
import { canSetScreeningStatus } from "@/lib/rbac/screening-transitions";
import { firstEmbeddedOr } from "@/lib/supabase/embed";
import { getSupabaseClient } from "@/lib/supabase/client";
import { screeningUpdateConflict } from "@/lib/ops/model";
import {
  isMissingFailureColumn,
  SCREENING_LIST_COLUMNS,
  SCREENING_LIST_COLUMNS_LEGACY,
  SCREENING_LIST_COLUMNS_NO_FAILURE,
  SCREENING_LIST_WITH_DETAILS,
  SCREENING_LIST_WITH_DETAILS_LEGACY,
  SCREENING_LIST_WITH_DETAILS_NO_FAILURE,
} from "@/lib/supabase/query-columns";
import { isMissingDemographicsColumn } from "@/lib/profile/demographics";
import { isMissingSchemaError, toErrorMessage } from "@/lib/errors";
import type {
  CriterionResult,
  Patient,
  Protocol,
  ScreeningStatus,
  ScreeningWithRelations,
} from "@/lib/types";

function normalizeScreening(
  row: ScreeningWithRelations
): ScreeningWithRelations {
  const raw = row as ScreeningWithRelations & {
    patients: Patient | Patient[] | null;
    protocols:
      | Pick<Protocol, "id" | "title" | "code_name" | "status">
      | Pick<Protocol, "id" | "title" | "code_name" | "status">[]
      | null;
  };
  return {
    ...row,
    patients: firstEmbeddedOr(raw.patients, {
      id: row.patient_id,
      clinic_id: "",
      first_name: "Paciente",
      last_name: "sin ficha",
      birth_date: "",
      gender: "other",
      created_at: row.created_at,
    }),
    protocols: firstEmbeddedOr(raw.protocols, {
      id: row.protocol_id,
      title: "Protocolo",
      code_name: "—",
      status: "active",
    }),
  };
}

export function useScreenings(options?: { includeMatchDetails?: boolean }) {
  const [screenings, setScreenings] = useState<ScreeningWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabaseReady = useSupabaseReady();
  const { role, isReadOnly } = useRole();
  const includeMatchDetails = options?.includeMatchDetails !== false;

  const fetchScreenings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const fullSelect = includeMatchDetails
        ? SCREENING_LIST_WITH_DETAILS
        : SCREENING_LIST_COLUMNS;
      const withoutFailure = includeMatchDetails
        ? SCREENING_LIST_WITH_DETAILS_NO_FAILURE
        : SCREENING_LIST_COLUMNS_NO_FAILURE;
      const full = await supabase
        .from("screenings")
        .select(fullSelect)
        .order("updated_at", { ascending: false });
      const afterFailure =
        full.error && isMissingFailureColumn(full.error.message)
          ? await supabase
              .from("screenings")
              .select(withoutFailure)
              .order("updated_at", { ascending: false })
          : full;
      const result =
        afterFailure.error &&
        isMissingDemographicsColumn(afterFailure.error.message)
          ? await supabase
              .from("screenings")
              .select(
                includeMatchDetails
                  ? SCREENING_LIST_WITH_DETAILS_LEGACY
                  : SCREENING_LIST_COLUMNS_LEGACY
              )
              .order("updated_at", { ascending: false })
          : afterFailure;
      if (result.error) throw result.error;
      setScreenings(
        ((result.data ?? []) as unknown as ScreeningWithRelations[]).map(
          normalizeScreening
        )
      );
    } catch (e) {
      setError(toErrorMessage(e, "Error al cargar screenings"));
    } finally {
      setLoading(false);
    }
  }, [includeMatchDetails]);

  useEffect(() => {
    if (!supabaseReady) return;
    void fetchScreenings();
  }, [supabaseReady, fetchScreenings]);

  const updateStatus = useCallback(
    async (
      screeningId: string,
      status: ScreeningStatus,
      failureReason?: string
    ) => {
      if (isReadOnly || !role) {
        throw new Error("Monitor CRA: acceso de solo lectura.");
      }

      if (!canSetScreeningStatus(role, status)) {
        throw new Error("Tu rol no puede mover pacientes a esta etapa.");
      }

      const reason = failureReason?.trim() ?? "";
      if (status === "screen_failure" && reason.length < 8) {
        throw new Error(
          "Registra el motivo del screen failure (al menos 8 caracteres)."
        );
      }

      const previous = screenings.find((s) => s.id === screeningId);

      // Actualización optimista para que el Kanban responda al instante.
      setScreenings((prev) =>
        prev.map((s) =>
          s.id === screeningId
            ? {
                ...s,
                status,
                failure_reason:
                  status === "screen_failure" ? reason : s.failure_reason,
              }
            : s
        )
      );
      const supabase = getSupabaseClient();
      const patch =
        status === "screen_failure" ? { status, failure_reason: reason } : { status };
      let query = supabase
        .from("screenings")
        .update(patch)
        .eq("id", screeningId);
      if (previous?.updated_at) {
        query = query.eq("updated_at", previous.updated_at);
      }
      const { data, error } = await query.select("id");
      if (error) {
        await fetchScreenings();
        if (isMissingSchemaError(error)) {
          throw new Error(
            "Falta aplicar la migración 20261021040000_explainable_rematch_consent.sql para guardar el motivo."
          );
        }
        throw error;
      }
      if (screeningUpdateConflict(data?.length ?? 0)) {
        await fetchScreenings();
        throw new Error(
          "Otra persona ya movió este screening. Recargué el tablero; vuelve a intentar."
        );
      }

      if (previous && previous.status !== status) {
        void fetch("/api/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tableName: "patients",
            recordId: previous.patient_id,
            description: `Cambio de estatus de screening: ${previous.status} → ${status}.${
              status === "screen_failure" ? ` Motivo: ${reason}` : ""
            }`,
            metadata: {
              event_type: "screening_status_change",
              screening_id: screeningId,
              protocol_id: previous.protocol_id,
              previous_status: previous.status,
              new_status: status,
              failure_reason: status === "screen_failure" ? reason : undefined,
            },
          }),
        }).catch(() => {
          /* La auditoría no debe bloquear el flujo clínico */
        });
      }
    },
    [fetchScreenings, screenings, role, isReadOnly]
  );

  return { screenings, loading, error, updateStatus, refetch: fetchScreenings };
}

/**
 * Registra (o actualiza) el screening de un paciente en un protocolo,
 * guardando el score y el detalle del match calculados por el motor de reglas.
 */
export async function upsertScreening(input: {
  patient_id: string;
  protocol_id: string;
  status?: ScreeningStatus;
  match_score: number;
  match_details: CriterionResult[];
}): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("screenings").upsert(
    {
      patient_id: input.patient_id,
      protocol_id: input.protocol_id,
      status: input.status ?? "pre_screening",
      match_score: input.match_score,
      match_details: input.match_details,
    },
    { onConflict: "patient_id,protocol_id" }
  );
  if (error) throw error;
}
