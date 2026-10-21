"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSupabaseReady } from "@/hooks/useSupabaseReady";
import { evaluatePatientAgainstProtocol } from "@/lib/matching";
import { firstEmbedded } from "@/lib/supabase/embed";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getSessionOrganizationId } from "@/lib/supabase/current-organization";
import {
  PATIENT_WITH_PROFILE_COLUMNS,
  PATIENT_WITH_PROFILE_COLUMNS_LEGACY,
  PATIENT_WITH_PROFILE_COLUMNS_NO_ANAMNESIS,
  PROTOCOL_LIST_COLUMNS,
  isMissingAnamnesisColumn,
} from "@/lib/supabase/query-columns";
import { isMissingDemographicsColumn } from "@/lib/profile/demographics";
import { isMissingSchemaError, toErrorMessage } from "@/lib/errors";
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

export type ReuseBasis = "written" | "verbal_documented";

export interface ReuseConsent {
  id: string;
  patient_id: string;
  basis: ReuseBasis;
  note: string;
  consented_on: string;
  expires_on: string | null;
}

export interface RematchOpportunity {
  patient: Patient;
  profile: ClinicalProfile | null;
  /** Screenings fallidos que originan el re-match. */
  failures: ScreeningWithRelations[];
  /** Protocolos activos alternativos. Vacío si no hay consentimiento vigente. */
  candidates: { protocol: Protocol; result: MatchResult }[];
  reuse: ReuseConsent | null;
  /** Sin la migración, no se muestran candidatos: el control queda cerrado. */
  reuseSchemaMissing: boolean;
}

export const REUSE_PURPOSE =
  "Reutilizar el expediente para buscar otros protocolos del mismo sitio tras un screen failure.";

/**
 * Motor de re-matching: solo carga screen failures y esos pacientes,
 * no toda la tabla de patients/screenings (Disk IO).
 */
export function useRematch() {
  const [patients, setPatients] = useState<PatientWithProfile[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [screenings, setScreenings] = useState<ScreeningWithRelations[]>([]);
  const [enrolledPairs, setEnrolledPairs] = useState<Set<string>>(new Set());
  const [reuseByPatient, setReuseByPatient] = useState<Map<string, ReuseConsent>>(
    new Map()
  );
  const [reuseSchemaMissing, setReuseSchemaMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabaseReady = useSupabaseReady();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();

      const failuresRes = await supabase
        .from("screenings")
        .select(
          "id, patient_id, protocol_id, status, match_score, failure_reason, failure_recorded_at, created_at, updated_at, patients(id, first_name, last_name, birth_date, gender), protocols(id, title, code_name, status)"
        )
        .eq("status", "screen_failure");

      const failuresWithoutReason =
        failuresRes.error && isMissingSchemaError(failuresRes.error)
          ? await supabase
              .from("screenings")
              .select(
                "id, patient_id, protocol_id, status, match_score, created_at, updated_at, patients(id, first_name, last_name, birth_date, gender), protocols(id, title, code_name, status)"
              )
              .eq("status", "screen_failure")
          : failuresRes;

      if (failuresWithoutReason.error) throw failuresWithoutReason.error;
      const failureRows = failuresWithoutReason.data;

      const failures = (failureRows ??
        []) as unknown as ScreeningWithRelations[];
      const patientIds = [
        ...new Set(failures.map((s) => s.patient_id).filter(Boolean)),
      ];

      if (patientIds.length === 0) {
        setPatients([]);
        setProtocols([]);
        setScreenings([]);
        setEnrolledPairs(new Set());
        setReuseByPatient(new Map());
        setReuseSchemaMissing(false);
        return;
      }

      const fullPatients = await supabase
        .from("patients")
        .select(PATIENT_WITH_PROFILE_COLUMNS)
        .in("id", patientIds);
      let patientsError = fullPatients.error;
      let patientsUnknown: unknown = fullPatients.data;
      if (patientsError && isMissingAnamnesisColumn(patientsError.message)) {
        const retry = await supabase
          .from("patients")
          .select(PATIENT_WITH_PROFILE_COLUMNS_NO_ANAMNESIS)
          .in("id", patientIds);
        patientsError = retry.error;
        patientsUnknown = retry.data;
      }
      if (patientsError && isMissingDemographicsColumn(patientsError.message)) {
        const retry = await supabase
          .from("patients")
          .select(PATIENT_WITH_PROFILE_COLUMNS_LEGACY)
          .in("id", patientIds);
        patientsError = retry.error;
        patientsUnknown = retry.data;
      }

      const [protocolsRes, enrolledRes] = await Promise.all([
        supabase
          .from("protocols")
          .select(PROTOCOL_LIST_COLUMNS)
          .eq("status", "active"),
        supabase
          .from("screenings")
          .select("patient_id, protocol_id")
          .in("patient_id", patientIds),
      ]);

      if (patientsError) throw patientsError;
      if (protocolsRes.error) throw protocolsRes.error;
      if (enrolledRes.error) throw enrolledRes.error;

      const consentRes = await supabase
        .from("patient_reuse_consents")
        .select("id, patient_id, basis, note, consented_on, expires_on, status")
        .in("patient_id", patientIds)
        .eq("status", "active");

      let schemaMissing = Boolean(
        failuresRes.error && isMissingSchemaError(failuresRes.error)
      );
      const consentMap = new Map<string, ReuseConsent>();
      if (consentRes.error) {
        if (!isMissingSchemaError(consentRes.error)) throw consentRes.error;
        schemaMissing = true;
      } else {
        const today = new Date().toISOString().slice(0, 10);
        for (const row of consentRes.data ?? []) {
          const consent = row as ReuseConsent;
          if (consent.expires_on && consent.expires_on < today) continue;
          consentMap.set(consent.patient_id, consent);
        }
      }

      setPatients((patientsUnknown ?? []) as unknown as PatientWithProfile[]);
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
      setReuseByPatient(consentMap);
      setReuseSchemaMissing(schemaMissing);
    } catch (e) {
      setError(toErrorMessage(e, "Error al cargar datos"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabaseReady) return;
    void fetchAll();
  }, [supabaseReady, fetchAll]);

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
      const profile = firstEmbedded(clinical_profiles);

      const reuse = reuseSchemaMissing
        ? null
        : (reuseByPatient.get(patientId) ?? null);
      const candidates =
        reuse == null
          ? []
          : protocols
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
        reuse,
        reuseSchemaMissing,
      });
    }

    return result.sort((a, b) => b.candidates.length - a.candidates.length);
  }, [screenings, patients, protocols, enrolledPairs, reuseByPatient, reuseSchemaMissing]);

  const sendToPreScreening = useCallback(
    async (opportunity: RematchOpportunity, protocolId: string) => {
      const candidate = opportunity.candidates.find(
        (c) => c.protocol.id === protocolId
      );
      if (!candidate) return;
      if (reuseSchemaMissing || !opportunity.reuse) {
        throw new Error(
          "Hace falta un consentimiento vigente para reutilizar el expediente en otro protocolo."
        );
      }
      await upsertScreening({
        patient_id: opportunity.patient.id,
        protocol_id: protocolId,
        match_score: candidate.result.score,
        match_details: candidate.result.details,
      });
      await fetchAll();
    },
    [fetchAll, reuseSchemaMissing]
  );

  const recordReuseConsent = useCallback(
    async (patientId: string, basis: ReuseBasis, note: string) => {
      const supabase = getSupabaseClient();
      const organizationId = await getSessionOrganizationId(supabase);
      const { error: insertError } = await supabase
        .from("patient_reuse_consents")
        .insert({
          organization_id: organizationId,
          patient_id: patientId,
          basis,
          purpose: REUSE_PURPOSE,
          note: note.trim(),
        });
      if (insertError) throw insertError;
      await fetchAll();
    },
    [fetchAll]
  );

  const revokeReuseConsent = useCallback(
    async (consentId: string) => {
      const supabase = getSupabaseClient();
      const { error: revokeError } = await supabase
        .from("patient_reuse_consents")
        .update({ status: "revoked" })
        .eq("id", consentId);
      if (revokeError) throw revokeError;
      await fetchAll();
    },
    [fetchAll]
  );

  return {
    opportunities,
    loading,
    error,
    sendToPreScreening,
    recordReuseConsent,
    revokeReuseConsent,
  };
}

export type { Screening };
