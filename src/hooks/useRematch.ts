"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { evaluatePatientAgainstProtocol } from "@/lib/matching";
import {
  PATIENT_WITH_PROFILE_COLUMNS,
  PROTOCOL_LIST_COLUMNS,
} from "@/lib/supabase/query-columns";
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
 * Motor de re-matching: solo carga screen failures y esos pacientes,
 * no toda la tabla de patients/screenings (Disk IO).
 */
export function useRematch() {
  const [patients, setPatients] = useState<PatientWithProfile[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [screenings, setScreenings] = useState<ScreeningWithRelations[]>([]);
  const [enrolledPairs, setEnrolledPairs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();

      const failuresRes = await supabase
        .from("screenings")
        .select(
          "id, patient_id, protocol_id, status, match_score, created_at, updated_at, patients(id, first_name, last_name, birth_date, gender), protocols(id, title, code_name, status)"
        )
        .eq("status", "screen_failure");

      if (failuresRes.error) throw failuresRes.error;

      const failures = (failuresRes.data ??
        []) as unknown as ScreeningWithRelations[];
      const patientIds = [
        ...new Set(failures.map((s) => s.patient_id).filter(Boolean)),
      ];

      if (patientIds.length === 0) {
        setPatients([]);
        setProtocols([]);
        setScreenings([]);
        setEnrolledPairs(new Set());
        return;
      }

      const [patientsRes, protocolsRes, enrolledRes] = await Promise.all([
        supabase
          .from("patients")
          .select(PATIENT_WITH_PROFILE_COLUMNS)
          .in("id", patientIds),
        supabase
          .from("protocols")
          .select(PROTOCOL_LIST_COLUMNS)
          .eq("status", "active"),
        supabase
          .from("screenings")
          .select("patient_id, protocol_id")
          .in("patient_id", patientIds),
      ]);

      if (patientsRes.error) throw patientsRes.error;
      if (protocolsRes.error) throw protocolsRes.error;
      if (enrolledRes.error) throw enrolledRes.error;

      setPatients((patientsRes.data ?? []) as unknown as PatientWithProfile[]);
      setProtocols((protocolsRes.data ?? []) as Protocol[]);
      setScreenings(failures);
      setEnrolledPairs(
        new Set(
          (enrolledRes.data ?? []).map(
            (s: { patient_id: string; protocol_id: string }) =>
              `${s.patient_id}:${s.protocol_id}`
          )
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchAll);
  }, [fetchAll]);

  const opportunities: RematchOpportunity[] = useMemo(() => {
    const byPatient = new Map<string, ScreeningWithRelations[]>();
    for (const s of screenings) {
      byPatient.set(s.patient_id, [
        ...(byPatient.get(s.patient_id) ?? []),
        s,
      ]);
    }

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

    return result.sort((a, b) => b.candidates.length - a.candidates.length);
  }, [screenings, patients, protocols, enrolledPairs]);

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
