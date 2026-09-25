"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SelectInput, TextInput } from "@/components/ui/Field";
import { ErrorState, LoadingState } from "@/components/ui/StateMessage";
import { useRole } from "@/contexts/role-context";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import {
  allocationRatioLabel,
  IWRS_BLINDING_LABEL,
  type IwrsBlinding,
  type IwrsConfig,
  type ProtocolArm,
} from "@/lib/iwrs/model";

export function ProtocolIwrsPanel({ protocolId }: { protocolId: string }) {
  const { isReadOnly, hasPermission } = useRole();
  const canEdit = hasPermission("protocols:write") && !isReadOnly;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<IwrsConfig | null>(null);
  const [arms, setArms] = useState<ProtocolArm[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [blinding, setBlinding] = useState<IwrsBlinding>("open");
  const [blockSize, setBlockSize] = useState(4);
  const [stratify, setStratify] = useState(true);
  const [armCode, setArmCode] = useState("A");
  const [armName, setArmName] = useState("");
  const [armWeight, setArmWeight] = useState(1);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/iwrs?protocol_id=${protocolId}`);
    const json = await readJsonResponse<{
      configs?: IwrsConfig[];
      arms?: ProtocolArm[];
      error?: string;
    }>(res);
    if (!res.ok) throw new Error(json?.error ?? "No se pudo cargar IWRS.");
    const next = json?.configs?.[0] ?? null;
    setConfig(next);
    setArms(json?.arms ?? []);
    setEnabled(next?.enabled ?? false);
    setBlinding(next?.blinding ?? "open");
    setBlockSize(next?.block_size ?? 4);
    setStratify(next?.stratify_gender ?? true);
  }, [protocolId]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve()
      .then(() => load())
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error IWRS.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function saveConfig(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/iwrs/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          protocol_id: protocolId,
          enabled,
          blinding,
          block_size: Number(blockSize),
          stratify_gender: stratify,
        }),
      });
      const json = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo guardar IWRS.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar IWRS.");
    } finally {
      setSaving(false);
    }
  }

  async function addArm(event: FormEvent) {
    event.preventDefault();
    if (!armName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/iwrs/arms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          protocol_id: protocolId,
          code: armCode,
          name: armName,
          allocation_weight: Number(armWeight),
        }),
      });
      const json = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo agregar el brazo.");
      setArmName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar el brazo.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Cargando IWRS…" />;

  return (
    <Card className="mt-4">
      <CardHeader
        title="IWRS — randomización"
        description="Asigna el brazo al azar después del screening. No cambia la elegibilidad."
      />
      <CardBody className="space-y-4">
        {error ? <ErrorState message={error} /> : null}
        <p className="text-xs leading-relaxed text-slate-600">
          El matching decide quién <em>puede</em> entrar. IWRS sortea el{" "}
          <strong>kit / brazo</strong> cuando el paciente ya está en Screening.
          Lista de bloques permutados, oculta. Coordinador puede randomizar;
          solo PI/sub desenmascaran.
        </p>

        <form onSubmit={saveConfig} className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-indigo-950">
            <input
              type="checkbox"
              checked={enabled}
              disabled={!canEdit}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            IWRS activo (no se puede arrastrar a Randomizado en el tracker)
          </label>
          <SelectInput
            label="Cegamiento"
            value={blinding}
            disabled={!canEdit}
            onChange={(e) => setBlinding(e.target.value as IwrsBlinding)}
          >
            {(Object.keys(IWRS_BLINDING_LABEL) as IwrsBlinding[]).map((key) => (
              <option key={key} value={key}>
                {IWRS_BLINDING_LABEL[key]}
              </option>
            ))}
          </SelectInput>
          <TextInput
            label="Tamaño de bloque"
            type="number"
            min={2}
            max={24}
            value={String(blockSize)}
            disabled={!canEdit}
            onChange={(e) => setBlockSize(Number(e.target.value))}
            hint="Se ajusta a la razón de brazos (1:1 → 4, 6, 8…)"
          />
          <label className="flex items-center gap-2 text-sm text-indigo-950">
            <input
              type="checkbox"
              checked={stratify}
              disabled={!canEdit}
              onChange={(e) => setStratify(e.target.checked)}
            />
            Estratificar por sexo biológico
          </label>
          {canEdit ? (
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando…" : config ? "Guardar IWRS" : "Activar IWRS"}
              </Button>
            </div>
          ) : null}
        </form>

        <div>
          <h3 className="text-sm font-semibold text-indigo-950">Brazos</h3>
          <p className="mb-2 text-xs text-slate-500">
            Razón actual: {allocationRatioLabel(arms)}
          </p>
          {arms.length === 0 ? (
            <p className="text-xs text-slate-400">Todavía no hay brazos.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {arms.map((arm) => (
                <li key={arm.id} className="rounded-md border border-violet-100 px-2 py-1.5">
                  <span className="font-mono text-xs text-violet-700">{arm.code}</span>{" "}
                  {arm.name}{" "}
                  <span className="text-xs text-slate-400">peso {arm.allocation_weight}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {canEdit ? (
          <form onSubmit={addArm} className="grid gap-3 sm:grid-cols-4">
            <TextInput
              label="Código"
              value={armCode}
              onChange={(e) => setArmCode(e.target.value)}
              placeholder="A"
            />
            <TextInput
              label="Nombre"
              value={armName}
              onChange={(e) => setArmName(e.target.value)}
              placeholder="Activo / Placebo"
            />
            <TextInput
              label="Peso"
              type="number"
              min={1}
              max={9}
              value={String(armWeight)}
              onChange={(e) => setArmWeight(Number(e.target.value))}
            />
            <div className="flex items-end">
              <Button type="submit" variant="secondary" disabled={saving}>
                Agregar brazo
              </Button>
            </div>
          </form>
        ) : null}
      </CardBody>
    </Card>
  );
}
