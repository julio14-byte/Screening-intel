"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SelectInput, TextInput } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  ErrorState,
  LoadingState,
} from "@/components/ui/StateMessage";
import { useEproForm } from "@/hooks/useEpro";
import { usePatients } from "@/hooks/usePatients";
import type { EproQuestion } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function EproFormPage() {
  const params = useParams();
  const formId = params.formId as string;
  const { form, responses, loading, error, submitResponse } = useEproForm(formId);
  const { patients } = usePatients();

  const [patientId, setPatientId] = useState("");
  const [answers, setAnswers] = useState<Record<string, string | number | boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState(false);

  const patientOptions = useMemo(
    () =>
      patients.map((p) => ({
        id: p.id,
        label: `${p.last_name}, ${p.first_name}`,
      })),
    [patients]
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!patientId || !form) return;
    setSubmitting(true);
    setSubmitError(null);
    setSubmitOk(false);
    try {
      await submitResponse(patientId, answers);
      setSubmitOk(true);
      setAnswers({});
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error al guardar respuesta");
    } finally {
      setSubmitting(false);
    }
  }

  function renderQuestion(q: EproQuestion) {
    const value = answers[q.id];

    if (q.type === "yesno") {
      return (
        <SelectInput
          label={q.label}
          value={value === true ? "yes" : value === false ? "no" : ""}
          onChange={(e) =>
            setAnswers((prev) => ({
              ...prev,
              [q.id]: e.target.value === "yes",
            }))
          }
        >
          <option value="">Seleccionar…</option>
          <option value="yes">Sí</option>
          <option value="no">No</option>
        </SelectInput>
      );
    }

    if (q.type === "scale") {
      return (
        <TextInput
          label={q.label}
          type="number"
          min={q.min ?? 0}
          max={q.max ?? 10}
          value={value?.toString() ?? ""}
          onChange={(e) =>
            setAnswers((prev) => ({
              ...prev,
              [q.id]: Number(e.target.value),
            }))
          }
        />
      );
    }

    return (
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">{q.label}</span>
        <textarea
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          rows={3}
          value={typeof value === "string" ? value : ""}
          onChange={(e) =>
            setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
          }
        />
      </label>
    );
  }

  if (loading) return <LoadingState label="Cargando formulario ePRO…" />;
  if (error || !form) return <ErrorState message={error ?? "Formulario no encontrado."} />;

  return (
    <>
      <PageHeader
        title={form.title}
        description={form.description ?? "Completá en nombre del paciente (demo Fase A)."}
        actions={
          <Link href="/epro">
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Volver
            </Button>
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Nueva respuesta" />
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <SelectInput
                label="Paciente"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                required
              >
                <option value="">Seleccionar paciente…</option>
                {patientOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </SelectInput>

              {form.questions.map((q) => (
                <div key={q.id}>{renderQuestion(q)}</div>
              ))}

              {submitError ? (
                <p className="text-sm text-rose-600">{submitError}</p>
              ) : null}
              {submitOk ? (
                <p className="text-sm text-emerald-700">Respuesta guardada.</p>
              ) : null}

              <Button type="submit" disabled={submitting || !patientId}>
                <Send className="h-4 w-4" aria-hidden />
                {submitting ? "Guardando…" : "Enviar ePRO"}
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Respuestas recientes" />
          <CardBody className="space-y-3">
            {responses.length === 0 ? (
              <p className="text-sm text-slate-500">Aún no hay respuestas.</p>
            ) : (
              responses.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-sm"
                >
                  <p className="font-medium text-slate-900">
                    {r.patients.last_name}, {r.patients.first_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDate(r.submitted_at)}
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    {Object.entries(r.answers).map(([key, val]) => (
                      <li key={key}>
                        <span className="font-medium">{key}:</span> {String(val)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
