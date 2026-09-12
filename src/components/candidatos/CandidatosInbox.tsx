"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/StateMessage";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import { CandidatoTriagePanel } from "@/components/candidatos/CandidatoTriagePanel";
import { routes } from "@/lib/app/routes";

type SubmissionRow = {
  id: string;
  referral_code: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  status: string;
  contact_email: string | null;
  contact_phone: string | null;
  extracted_profile: {
    conditions?: string[];
    medications?: string[];
  };
  match_results: Array<{
    protocol_code: string;
    verdict: string;
    score: number;
  }>;
  created_at: string;
  converted_patient_id: string | null;
};

const VERDICT_LABEL: Record<string, string> = {
  eligible: "🟢 Posible candidato",
  pending: "🟡 Revisión",
  excluded: "🔴 Probable no",
};

export function CandidatosInbox() {
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/candidatos");
      const data = await readJsonResponse<{
        submissions?: SubmissionRow[];
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data?.error ?? "Error al cargar.");
      setRows(data?.submissions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const convertir = async (id: string) => {
    setActing(id);
    try {
      const res = await fetch(`/api/candidatos/${id}/convertir`, { method: "POST" });
      const data = await readJsonResponse<{ error?: string; patientId?: string }>(res);
      if (!res.ok) throw new Error(data?.error ?? "Error");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setActing(null);
    }
  };

  const archivar = async (id: string) => {
    setActing(id);
    try {
      const res = await fetch(`/api/candidatos/${id}/archivar`, { method: "POST" });
      const data = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data?.error ?? "Error");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setActing(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-indigo-600">Cargando candidatos…</p>;
  }

  const pending = rows.filter((r) => r.status === "pending");

  return (
    <div className="space-y-4">
      {error ? <ErrorState message={error} /> : null}

      {pending.length === 0 ? (
        <p className="text-sm text-indigo-600">
          No hay candidatos pendientes. Comparte el link del portal en{" "}
          <Link href={routes.app.portalSettings} className="text-violet-600 underline">
            configuración del portal
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-3">
          {pending.map((row) => {
            const topMatch = row.match_results[0];
            return (
              <li
                key={row.id}
                className="rounded-xl border border-violet-100 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-indigo-950">
                      {row.first_name} {row.last_name}
                    </p>
                    <p className="text-xs text-indigo-500">
                      {row.referral_code} · {new Date(row.created_at).toLocaleString("es")}
                    </p>
                    {row.contact_email ? (
                      <p className="text-sm text-indigo-700">{row.contact_email}</p>
                    ) : null}
                    {row.contact_phone ? (
                      <p className="text-sm text-indigo-700">{row.contact_phone}</p>
                    ) : null}
                  </div>
                  {topMatch ? (
                    <span className="text-sm font-medium text-indigo-800">
                      {VERDICT_LABEL[topMatch.verdict] ?? topMatch.verdict} ·{" "}
                      {topMatch.protocol_code}
                    </span>
                  ) : null}
                </div>

                {(row.extracted_profile.conditions?.length ?? 0) > 0 ? (
                  <p className="mt-2 text-sm text-indigo-700">
                    Condiciones: {row.extracted_profile.conditions?.join(", ")}
                  </p>
                ) : null}
                {(row.extracted_profile.medications?.length ?? 0) > 0 ? (
                  <p className="text-sm text-indigo-700">
                    Medicación: {row.extracted_profile.medications?.join(", ")}
                  </p>
                ) : null}

                <CandidatoTriagePanel submissionId={row.id} />

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    disabled={acting === row.id}
                    onClick={() => convertir(row.id)}
                  >
                    Convertir a paciente
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={acting === row.id}
                    onClick={() => archivar(row.id)}
                  >
                    Archivar
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
