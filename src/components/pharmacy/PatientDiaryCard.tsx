"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SelectInput } from "@/components/ui/Field";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import { useRole } from "@/contexts/role-context";
import type { Protocol } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type Entry = {
  id: string;
  diary_on: string;
  taken: boolean;
  taken_at: string | null;
  symptoms: string;
  severity: number;
  protocols: { code_name: string } | { code_name: string }[] | null;
};

function firstRel<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function PatientDiaryCard({
  patientId,
  protocols,
}: {
  patientId: string;
  protocols: Protocol[];
}) {
  const { isReadOnly } = useRole();
  const [protocolId, setProtocolId] = useState("");
  const selectedProtocolId = protocolId || protocols[0]?.id || "";
  const [entries, setEntries] = useState<Entry[]>([]);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/diario/entries?patient_id=${patientId}`);
    const json = await readJsonResponse<{ entries?: Entry[] }>(res);
    setEntries(json?.entries ?? []);
  }, [patientId]);

  useEffect(() => {
    void Promise.resolve()
      .then(() => load())
      .catch(() => setEntries([]));
  }, [load]);

  async function createLink() {
    if (!selectedProtocolId) {
      setError("Elegí un protocolo para generar el diario.");
      return;
    }
    setError(null);
    const res = await fetch("/api/diario/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_id: patientId, protocol_id: selectedProtocolId }),
    });
    const json = await readJsonResponse<{ url?: string; error?: string }>(res);
    if (!res.ok || !json?.url) {
      setError(json?.error ?? "No se pudo crear el link.");
      return;
    }
    setUrl(json.url);
  }

  return (
    <Card className="mt-6">
      <CardHeader
        title="Diario de toma"
        description="El paciente registra hora y síntomas en /diario (link mágico). No hace falta una app aparte ni un eSource tipo Clinical Ink."
      />
      <CardBody className="space-y-3">
        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        {!isReadOnly ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            {protocols.length > 1 ? (
              <SelectInput
                label="Protocolo"
                value={selectedProtocolId}
                onChange={(e) => {
                  setProtocolId(e.target.value);
                  setUrl(null);
                }}
              >
                <option value="">Seleccionar protocolo</option>
                {protocols.map((protocol) => (
                  <option key={protocol.id} value={protocol.id}>
                    {protocol.code_name} — {protocol.title}
                  </option>
                ))}
              </SelectInput>
            ) : null}
            <Button
              variant="secondary"
              disabled={!selectedProtocolId}
              onClick={() => void createLink()}
            >
              Generar link del diario
            </Button>
          </div>
        ) : null}
        {url ? (
          <p className="break-all font-mono text-[11px] text-violet-700">{url}</p>
        ) : null}
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500">Todavía no hay tomas registradas.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {entries.map((entry) => {
              const protocol = firstRel(entry.protocols);
              return (
                <li key={entry.id} className="rounded-md border border-violet-100 px-2 py-1.5">
                  <span className="font-mono text-xs">{entry.diary_on}</span>
                  {protocol?.code_name ? ` · ${protocol.code_name}` : ""}{" "}
                  {entry.taken
                    ? `Tomó${entry.taken_at ? ` · ${formatDate(entry.taken_at)}` : ""}`
                    : "No tomó"}
                  {entry.severity ? ` · molestia ${entry.severity}/10` : ""}
                  {entry.symptoms ? ` · ${entry.symptoms}` : ""}
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
