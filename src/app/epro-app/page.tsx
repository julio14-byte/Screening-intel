"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EproIdleGuard } from "@/components/epro-app/EproIdleGuard";
import { SubjectBadge } from "@/components/epro-app/SubjectBadge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/StateMessage";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import type { EproQuestion } from "@/lib/types";

type HoyPayload = {
  subject_code?: string;
  completed?: boolean;
  submitted_at?: string | null;
  form?: {
    id: string;
    title: string;
    description: string | null;
    questions: EproQuestion[];
  } | null;
  error?: string;
};

export default function EproHoyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HoyPayload | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number | boolean>>({});
  const [saving, setSaving] = useState(false);
  const [authed, setAuthed] = useState(false);

  const load = useCallback(async () => {
    const session = await fetch("/api/epro-app/p/sesion");
    if (!session.ok) {
      router.replace("/epro-app/entrar");
      return;
    }
    setAuthed(true);
    const res = await fetch("/api/epro-app/p/hoy");
    const json = await readJsonResponse<HoyPayload>(res);
    if (res.status === 401) {
      router.replace("/epro-app/entrar");
      return;
    }
    if (!res.ok) throw new Error(json?.error ?? "No se pudo cargar el cuestionario.");
    setData(json);
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve()
      .then(() => load())
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo cargar.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function logout() {
    await fetch("/api/epro-app/p/sesion", { method: "DELETE" });
    router.replace("/epro-app/entrar");
  }

  async function submit() {
    if (!data?.form) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/epro-app/p/hoy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const json = await readJsonResponse<{ error?: string; completed?: boolean }>(res);
      if (res.status === 409 || json?.completed) {
        setData((prev) => (prev ? { ...prev, completed: true } : prev));
        return;
      }
      if (!res.ok) throw new Error(json?.error ?? "No se pudo guardar.");
      setData((prev) => (prev ? { ...prev, completed: true } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Cargando cuestionario…" />;

  const questions = data?.form?.questions ?? [];
  const question = questions[step];
  const total = questions.length;

  if (data?.completed) {
    return (
      <>
        <EproIdleGuard enabled={authed} />
        <Card>
          <CardHeader title="Cuestionario completado por hoy" />
          <CardBody className="space-y-4">
            {data.subject_code ? <SubjectBadge code={data.subject_code} /> : null}
            <p className="text-base leading-relaxed text-indigo-950">
              Gracias. Ya registraste tus respuestas de hoy. Volvé mañana.
            </p>
            <button
              type="button"
              onClick={() => void logout()}
              className="min-h-14 w-full rounded-2xl border border-violet-200 text-base font-semibold text-indigo-900"
            >
              Cerrar sesión
            </button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!data?.form || !question) {
    return (
      <>
        <EproIdleGuard enabled={authed} />
        <Card>
          <CardHeader title="Sin cuestionario de hoy" />
          <CardBody className="space-y-4">
            {data?.subject_code ? <SubjectBadge code={data.subject_code} /> : null}
            <p className="text-sm text-slate-600">
              El centro todavía no tiene un cuestionario diario activo para tu estudio.
            </p>
            <button
              type="button"
              onClick={() => void logout()}
              className="min-h-14 w-full rounded-2xl border border-violet-200 text-base font-semibold"
            >
              Cerrar sesión
            </button>
          </CardBody>
        </Card>
      </>
    );
  }

  return (
    <>
      <EproIdleGuard enabled={authed} />
      <Card>
        <CardHeader
          title={data.form.title}
          description={data.form.description ?? "Respondé una pregunta a la vez."}
        />
        <CardBody className="space-y-5">
          {data.subject_code ? <SubjectBadge code={data.subject_code} /> : null}
          {error ? <ErrorState message={error} /> : null}
          <p className="text-xs font-medium uppercase tracking-wide text-violet-600">
            Pregunta {step + 1} de {total}
          </p>
          <h2 className="text-xl font-semibold leading-snug text-indigo-950">
            {question.label}
          </h2>
          <QuestionControl
            question={question}
            value={answers[question.id]}
            onChange={(value) =>
              setAnswers((prev) => ({ ...prev, [question.id]: value }))
            }
          />
          <div className="flex gap-2">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((n) => n - 1)}
                className="min-h-14 flex-1 rounded-2xl border border-violet-200 text-base font-semibold"
              >
                Atrás
              </button>
            ) : null}
            {step < total - 1 ? (
              <button
                type="button"
                disabled={answers[question.id] === undefined || answers[question.id] === ""}
                onClick={() => setStep((n) => n + 1)}
                className="min-h-14 flex-1 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-base font-semibold text-white disabled:opacity-50"
              >
                Siguiente
              </button>
            ) : (
              <button
                type="button"
                disabled={
                  saving ||
                  answers[question.id] === undefined ||
                  answers[question.id] === ""
                }
                onClick={() => void submit()}
                className="min-h-14 flex-1 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-base font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Guardando…" : "Enviar respuestas"}
              </button>
            )}
          </div>
        </CardBody>
      </Card>
    </>
  );
}

function QuestionControl({
  question,
  value,
  onChange,
}: {
  question: EproQuestion;
  value: string | number | boolean | undefined;
  onChange: (value: string | number | boolean) => void;
}) {
  if (question.type === "yesno") {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Sí", val: true },
          { label: "No", val: false },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => onChange(option.val)}
            className={`min-h-16 rounded-2xl text-lg font-semibold ${
              value === option.val
                ? "bg-violet-600 text-white"
                : "border border-violet-200 bg-white text-indigo-950"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  if (question.type === "scale") {
    const min = question.min ?? 0;
    const max = question.max ?? 10;
    const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    return (
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {numbers.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`min-h-14 rounded-2xl text-lg font-semibold ${
              value === n
                ? "bg-violet-600 text-white"
                : "border border-violet-200 bg-white text-indigo-950"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    );
  }

  return (
    <textarea
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      rows={4}
      className="min-h-28 w-full rounded-2xl border border-violet-200 p-4 text-base text-indigo-950 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-400"
      placeholder="Escribí acá"
    />
  );
}
