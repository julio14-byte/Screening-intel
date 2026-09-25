"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SelectInput, TextInput } from "@/components/ui/Field";
import { ErrorState, LoadingState } from "@/components/ui/StateMessage";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import { useRole } from "@/contexts/role-context";

type Schedule = {
  id: string;
  visit_code: string;
  title: string;
  target_day: number;
  window_before_days: number;
  window_after_days: number;
  active: boolean;
  arm_id: string | null;
  protocol_arms: { code: string; name: string } | { code: string; name: string }[] | null;
};

function firstRel<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function ProtocolVisitCalendarPanel({ protocolId }: { protocolId: string }) {
  const { isReadOnly, hasPermission } = useRole();
  const canEdit = hasPermission("protocols:write") && !isReadOnly;
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("V2");
  const [title, setTitle] = useState("Semana 2");
  const [targetDay, setTargetDay] = useState("14");
  const [before, setBefore] = useState("2");
  const [after, setAfter] = useState("2");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/follow-up/calendario?protocol_id=${protocolId}`);
    const json = await readJsonResponse<{ schedules?: Schedule[]; error?: string }>(res);
    if (!res.ok) throw new Error(json?.error ?? "No se pudo cargar el calendario.");
    setSchedules(json?.schedules ?? []);
  }, [protocolId]);

  useEffect(() => {
    void Promise.resolve()
      .then(() => load())
      .catch((err) => setError(err instanceof Error ? err.message : "Error."))
      .finally(() => setLoading(false));
  }, [load]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/follow-up/calendario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          protocol_id: protocolId,
          visit_code: code,
          title,
          target_day: Number(targetDay),
          window_before_days: Number(before),
          window_after_days: Number(after),
        }),
      });
      const json = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo guardar.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Cargando calendario de visitas…" />;

  return (
    <Card className="mt-6">
      <CardHeader
        title="Calendario de seguimiento"
        description="Día objetivo desde randomización/primera dosis y ventana permitida (ej. día 14, −2/+2 → días 12 a 16). Aplica a todos los brazos si no elegís uno."
      />
      <CardBody className="space-y-4">
        {error ? <ErrorState message={error} /> : null}
        {canEdit ? (
          <form onSubmit={(event) => void onCreate(event)} className="grid gap-3 sm:grid-cols-6">
            <TextInput label="Código" value={code} onChange={(e) => setCode(e.target.value)} required />
            <TextInput
              label="Nombre"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="sm:col-span-2"
              required
            />
            <TextInput
              label="Día objetivo"
              type="number"
              min={0}
              value={targetDay}
              onChange={(e) => setTargetDay(e.target.value)}
              required
            />
            <TextInput
              label="Ventana −"
              type="number"
              min={0}
              value={before}
              onChange={(e) => setBefore(e.target.value)}
            />
            <TextInput
              label="Ventana +"
              type="number"
              min={0}
              value={after}
              onChange={(e) => setAfter(e.target.value)}
            />
            <div className="sm:col-span-6">
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando…" : "Agregar visita al protocolo"}
              </Button>
            </div>
          </form>
        ) : null}
        {schedules.length === 0 ? (
          <p className="text-sm text-slate-500">Todavía no hay visitas en el calendario.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {schedules.map((row) => {
              const arm = firstRel(row.protocol_arms);
              return (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-violet-100 px-2 py-1.5"
                >
                  <span>
                    <span className="font-mono text-xs">{row.visit_code}</span> · {row.title} · día{" "}
                    {row.target_day} (ventana −{row.window_before_days}/+{row.window_after_days})
                    {arm ? ` · brazo ${arm.code}` : " · todos los brazos"}
                    {row.active ? "" : " · inactiva"}
                  </span>
                  {canEdit ? (
                    <SelectInput
                      value={row.active ? "1" : "0"}
                      onChange={(e) => {
                        void fetch("/api/follow-up/calendario", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            id: row.id,
                            active: e.target.value === "1",
                          }),
                        }).then(() => load());
                      }}
                    >
                      <option value="1">Activa</option>
                      <option value="0">Inactiva</option>
                    </SelectInput>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
