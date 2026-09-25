"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import { useRole } from "@/contexts/role-context";
import { formatDate } from "@/lib/utils";

type Entry = {
  id: string;
  answered_on: string;
  submitted_at: string;
  answers: Record<string, string | number | boolean>;
  epro_forms: { title: string } | { title: string }[] | null;
};

function firstRel<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function PatientEproInviteCard({ patientId }: { patientId: string }) {
  const { isReadOnly } = useRole();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [url, setUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [subjectCode, setSubjectCode] = useState<string | null>(null);
  const [activatedAt, setActivatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/epro-app/respuestas?patient_id=${patientId}`);
    const json = await readJsonResponse<{
      entries?: Entry[];
      activated_at?: string | null;
      hint?: string;
      error?: string;
    }>(res);
    setEntries(json?.entries ?? []);
    setActivatedAt(json?.activated_at ?? null);
    setHint(json?.hint ?? null);
  }, [patientId]);

  useEffect(() => {
    void Promise.resolve()
      .then(() => load())
      .catch(() => setEntries([]));
  }, [load]);

  async function invite() {
    setError(null);
    const res = await fetch("/api/epro-app/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_id: patientId }),
    });
    const json = await readJsonResponse<{
      url?: string;
      expires_at?: string;
      subject_code?: string;
      error?: string;
    }>(res);
    if (!res.ok || !json?.url) {
      setError(json?.error ?? "No se pudo generar la invitación.");
      return;
    }
    setUrl(json.url);
    setExpiresAt(json.expires_at ?? null);
    setSubjectCode(json.subject_code ?? null);
  }

  return (
    <Card className="mt-6">
      <CardHeader
        title="ePRO móvil del sujeto"
        description="El paciente no se registra solo. El coordinador genera un link de 48 horas desde el EDC. En /epro-app solo ve su código de sujeto, nunca nombre, teléfono ni correo."
      />
      <CardBody className="space-y-3">
        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        {hint ? <p className="text-xs text-amber-700">{hint}</p> : null}
        {activatedAt ? (
          <p className="text-xs text-emerald-700">
            PIN activado el {formatDate(activatedAt)}.
          </p>
        ) : (
          <p className="text-xs text-slate-500">Todavía no activó el PIN.</p>
        )}
        {!isReadOnly ? (
          <Button variant="secondary" onClick={() => void invite()}>
            Generar invitación ePRO (48 h)
          </Button>
        ) : (
          <p className="text-xs text-slate-500">
            El monitor no genera el link. Lo crea el coordinador desde el expediente.
          </p>
        )}
        {url ? (
          <div className="space-y-1">
            <p className="break-all font-mono text-[11px] text-violet-700">{url}</p>
            {subjectCode ? (
              <p className="text-xs text-slate-600">
                El sujeto entra después con el código {subjectCode} y su PIN.
              </p>
            ) : null}
            {expiresAt ? (
              <p className="text-xs text-slate-500">Vence {formatDate(expiresAt)}.</p>
            ) : null}
          </div>
        ) : null}
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500">Todavía no hay cuestionarios diarios.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {entries.map((entry) => {
              const form = firstRel(entry.epro_forms);
              return (
                <li key={entry.id} className="rounded-md border border-violet-100 px-2 py-1.5">
                  <span className="font-mono text-xs">{entry.answered_on}</span>
                  {form?.title ? ` · ${form.title}` : ""} · enviado{" "}
                  {formatDate(entry.submitted_at)}
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
