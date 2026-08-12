"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { evaluatePatientAgainstProtocol } from "@/lib/matching";
import type {
  ClinicalProfile,
  MatchResult,
  Patient,
  PatientWithProfile,
  Protocol,
  Screening,
  ScreeningWithRelations,
} from "@/lib/types";
import { upsertScreening } from "./useScreenings";

export interface RematchOpportunity {
  patient: Patient;
  profile: ClinicalProfile | null;
  /** Screenings fallidos que originan el re-match. */
  failures: ScreeningWithRelations[];
  /** Protocolos activos alternativos donde el paciente podría encajar. */
  candidates: { protocol: Protocol; result: MatchResult }[];
}

/**
 * Motor de re-matching: por cada paciente con screen_failure, evalúa el resto
 * de los protocolos activos de la clínica (donde el paciente aún no está
 * enrolado) y propone alternativas para no perderlo.
 */
export function useRematch() {
  const [patients, setPatients] = useState<PatientWithProfile[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [screenings, setScreenings] = useState<ScreeningWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const [patientsRes, protocolsRes, screeningsRes] = await Promise.all([
        supabase.from("patients").select("*, clinical_profiles(*)"),
        supabase.from("protocols").select("*").eq("status", "active"),
        supabase
          .from("screenings")
          .select("*, patients(*), protocols(id, title, code_name, status)"),
      ]);
      if (patientsRes.error) throw patientsRes.error;
      if (protocolsRes.error) throw protocolsRes.error;
      if (screeningsRes.error) throw screeningsRes.error;
      setPatients((patientsRes.data ?? []) as unknown as PatientWithProfile[]);
      setProtocols((protocolsRes.data ?? []) as Protocol[]);
      setScreenings(
        (screeningsRes.data ?? []) as unknown as ScreeningWithRelations[]
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Deferido a una microtarea para no llamar setState de forma síncrona
    // dentro del efecto (regla react-hooks/set-state-in-effect).
    void Promise.resolve().then(fetchAll);
  }, [fetchAll]);

  const opportunities: RematchOpportunity[] = useMemo(() => {
    const failed = screenings.filter((s) => s.status === "screen_failure");
    const byPatient = new Map<string, ScreeningWithRelations[]>();
    for (const s of failed) {
      byPatient.set(s.patient_id, [
        ...(byPatient.get(s.patient_id) ?? []),
        s,
      ]);
    }

    const enrolledPairs = new Set(
      screenings.map((s) => `${s.patient_id}:${s.protocol_id}`)
    );

    const result: RematchOpportunity[] = [];
    for (const [patientId, failures] of byPatient) {
      const row = patients.find((p) => p.id === patientId);
      if (!row) continue;
      const { clinical_profiles, ...patient } = row;
      const profile = clinical_profiles?.[0] ?? null;

      const candidates = protocols
        .filter((p) => !enrolledPairs.has(`${patientId}:${p.id}`))
        .map((protocol) => ({
          protocol,
          result: evaluatePatientAgainstProtocol(
            patient as Patient,
            profile,
            protocol
          ),
        }))
        .filter(({ result }) => result.verdict !== "excluded")
        .sort(
          (a, b) =>
            Number(b.result.verdict === "eligible") -
              Number(a.result.verdict === "eligible") ||
            b.result.score - a.result.score
        );

      result.push({
        patient: patient as Patient,
        profile,
        failures,
        candidates,
      });
    }

    // Pacientes con más alternativas viables primero.
    return result.sort((a, b) => b.candidates.length - a.candidates.length);
  }, [screenings, patients, protocols]);

  const sendToPreScreening = useCallback(
    async (opportunity: RematchOpportunity, protocolId: string) => {
      const candidate = opportunity.candidates.find(
        (c) => c.protocol.id === protocolId
      );
      if (!candidate) return;
      await upsertScreening({
        patient_id: opportunity.patient.id,
        protocol_id: protocolId,
        match_score: candidate.result.score,
        match_details: candidate.result.details,
      });
      await fetchAll();
    },
    [fetchAll]
  );

  return { opportunities, loading, error, sendToPreScreening };
}

export type { Screening };
