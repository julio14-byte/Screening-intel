"use client";

import { FormEvent, useState } from "react";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/StateMessage";
import { readJsonResponse } from "@/lib/http/readJsonResponse";

type Turn = { role: "user" | "assistant"; content: string };

const PROMPTS = [
  "¿Qué datos faltan para decidir?",
  "¿Qué citas hay mañana?",
  "¿Cómo vamos con la meta de enrolamiento?",
];

export default function AssistantPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    const next = [...turns, { role: "user" as const, content }];
    setTurns(next);
    setDraft("");
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      const json = await readJsonResponse<{ reply?: string; error?: string }>(response);
      if (!response.ok) throw new Error(json?.error ?? "No se pudo consultar.");
      setTurns([...next, { role: "assistant", content: json?.reply ?? "" }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo consultar.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void ask(draft);
  };

  return (
    <>
      <PageHeader
        title="Asistente"
        description="Lee lo que falta para decidir, las citas de mañana y la meta de enrolamiento. No cambia etapas ni el semáforo."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => void ask(prompt)}
            className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-900 ring-1 ring-violet-200 hover:bg-violet-100"
          >
            {prompt}
          </button>
        ))}
      </div>
      {error ? (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      ) : null}
      <Card>
        <CardBody className="space-y-3">
          {turns.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-indigo-700">
              <Sparkles className="h-4 w-4 text-violet-500" aria-hidden />
              Elige una pregunta o escríbela abajo.
            </p>
          ) : (
            turns.map((turn, index) => (
              <p
                key={`${turn.role}-${index}`}
                className={
                  turn.role === "user"
                    ? "text-sm font-medium text-indigo-950"
                    : "whitespace-pre-wrap text-sm leading-relaxed text-slate-700"
                }
              >
                {turn.content}
              </p>
            ))
          )}
          <form onSubmit={onSubmit} className="flex gap-2 pt-2">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Pregunta sobre el screening del centro"
              className="w-full rounded-md border border-violet-200 px-3 py-2 text-sm text-indigo-950"
              maxLength={2000}
            />
            <Button type="submit" disabled={loading || draft.trim().length === 0}>
              {loading ? "Leyendo…" : "Preguntar"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
