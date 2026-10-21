"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/StateMessage";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import { toErrorMessage } from "@/lib/errors";
import { routes } from "@/lib/app/routes";
import { useRole } from "@/contexts/role-context";
import { ContactLogPanel } from "@/components/candidatos/ContactLogPanel";
import {
  buildContactStatus,
  CONTACT_STATE_LABELS,
  summarizeContact,
  type ContactAttempt,
  type ContactState,
} from "@/lib/candidato/contact-log";
import { cn } from "@/lib/utils";

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

const STATE_STYLE: Record<ContactState, string> = {
  overdue: "bg-rose-50 text-rose-800",
  follow_up_due: "bg-amber-50 text-amber-900",
  due_soon: "bg-amber-50 text-amber-900",
  new: "bg-slate-100 text-slate-700",
  unreachable: "bg-slate-100 text-slate-700",
  waiting: "bg-sky-50 text-sky-800",
  closed: "bg-emerald-50 text-emerald-800",
};

export function CandidatosInbox() {
  const { isReadOnly } = useRole();
  const [attempts, setAttempts] = useState<ContactAttempt[]>([]);
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, contactRes] = await Promise.all([
        fetch("/api/candidatos"),
        fetch("/api/candidatos/contactos"),
      ]);
      const data = await readJsonResponse<{
        submissions?: SubmissionRow[];
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data?.error ?? "Error al cargar.");
      setRows(data?.submissions ?? []);
      const contact = await readJsonResponse<{
        attempts?: ContactAttempt[];
        error?: string;
      }>(contactRes);
      if (contactRes.ok) {
        setAttempts(contact?.attempts ?? []);
      } else {
        setError(contact?.error ?? "No se pudo cargar la bitácora de contacto.");
      }
    } catch (e) {
      setError(toErrorMessage(e, "Error"));
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
      setError(toErrorMessage(e, "Error"));
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
      setError(toErrorMessage(e, "Error"));
    } finally {
      setActing(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-indigo-600">Cargando candidatos…</p>;
  }

  const now = new Date();
  const withStatus = rows
    .filter((r) => r.status === "pending")
    .map((row) => ({
      row,
      attempts: attempts.filter((a) => a.submission_id === row.id),
    }))
    .map((item) => ({
      ...item,
      status: buildContactStatus(item.row.created_at, item.attempts, now),
    }))
    .sort(
      (a, b) =>
        b.status.urgency - a.status.urgency ||
        a.row.created_at.localeCompare(b.row.created_at)
    );
  const pending = withStatus;
  const contactSummary = summarizeContact(withStatus.map((i) => i.status));

  return (
    <div className="space-y-4">
      {error ? <ErrorState message={error} /> : null}

      {contactSummary.overdue + contactSummary.followUpDue > 0 ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {contactSummary.overdue > 0
            ? `${contactSummary.overdue} candidato(s) llevan más de 48 h sin contacto. `
            : ""}
          {contactSummary.followUpDue > 0
            ? `${contactSummary.followUpDue} tienen un reintento pendiente.`
            : ""}
        </p>
      ) : null}

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
          {pending.map(({ row, attempts: rowAttempts, status }) => {
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
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium",
                        STATE_STYLE[status.state]
                      )}
                    >
                      {CONTACT_STATE_LABELS[status.state]}
                      {status.state === "overdue" && status.hoursWithoutContact !== null
                        ? ` (${status.hoursWithoutContact} h)`
                        : ""}
                    </span>
                    {topMatch ? (
                      <span className="text-sm font-medium text-indigo-800">
                        {VERDICT_LABEL[topMatch.verdict] ?? topMatch.verdict} ·{" "}
                        {topMatch.protocol_code}
                      </span>
                    ) : null}
                  </div>
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

                <ContactLogPanel
                  submissionId={row.id}
                  attempts={rowAttempts}
                  canWrite={!isReadOnly}
                  onSaved={(attempt) => setAttempts((prev) => [attempt, ...prev])}
                />

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
