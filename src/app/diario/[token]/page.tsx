"use client";

import { FormEvent, use, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { TextInput, TextArea } from "@/components/ui/Field";
import { ErrorState, LoadingState } from "@/components/ui/StateMessage";
import { readJsonResponse } from "@/lib/http/readJsonResponse";

export default function DiarioPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("Hola");
  const [protocol, setProtocol] = useState("");
  const [taken, setTaken] = useState(true);
  const [takenAt, setTakenAt] = useState(() =>
    new Date().toISOString().slice(0, 16)
  );
  const [symptoms, setSymptoms] = useState("");
  const [severity, setSeverity] = useState(0);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/diario/t/${encodeURIComponent(token)}`)
      .then((res) =>
        readJsonResponse<{
          first_name?: string;
          protocol_code?: string;
          error?: string;
        }>(res).then((json) => ({ res, json }))
      )
      .then(({ res, json }) => {
        if (cancelled) return;
        if (!res.ok) throw new Error(json?.error ?? "Link inválido.");
        setFirstName(json?.first_name ?? "Hola");
        setProtocol(json?.protocol_code ?? "");
      })
      .catch((err) => {
        if (!cancelled) {
          setInvalid(err instanceof Error ? err.message : "No se pudo abrir el diario.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/diario/t/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taken,
          taken_at: taken ? new Date(takenAt).toISOString() : null,
          symptoms,
          severity,
        }),
      });
      const json = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo guardar.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Abriendo diario…" />;

  if (invalid) {
    return (
      <Card>
        <CardHeader title="No se pudo abrir el diario" description={invalid} />
      </Card>
    );
  }

  if (done) {
    return (
      <Card>
        <CardHeader
          title="Registrado"
          description="Gracias. Si aparece un síntoma nuevo, volvé a este mismo link mañana."
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title={`${firstName}, tu toma de hoy`}
        description={
          protocol
            ? `Estudio ${protocol}. Anotá la hora y si tuviste síntomas. El centro ve esto en Crisvia.`
            : "Anotá la hora y si tuviste síntomas."
        }
      />
      <CardBody>
        {error ? <ErrorState message={error} /> : null}
        <form onSubmit={(event) => void onSubmit(event)} className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-indigo-950">
            <input
              type="checkbox"
              checked={taken}
              onChange={(e) => setTaken(e.target.checked)}
            />
            Tomé la medicación del estudio hoy
          </label>
          {taken ? (
            <TextInput
              label="Hora"
              type="datetime-local"
              value={takenAt}
              onChange={(e) => setTakenAt(e.target.value)}
              required
            />
          ) : null}
          <TextInput
            label="Molestia (0 = nada, 10 = máxima)"
            type="number"
            min={0}
            max={10}
            value={String(severity)}
            onChange={(e) => setSeverity(Number(e.target.value))}
          />
          <TextArea
            label="Síntomas"
            rows={3}
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="Náuseas, dolor de cabeza, nada nuevo…"
          />
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar toma"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
