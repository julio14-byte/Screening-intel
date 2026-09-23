"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { TextInput } from "@/components/ui/Field";
import { ErrorState, LoadingState } from "@/components/ui/StateMessage";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import { formatQuantity, isLowStock } from "@/lib/pharmacy/model";
import type { MedicationLot, ProtocolStudyMedication } from "@/lib/types";
import { useRole } from "@/contexts/role-context";

type Props = {
  protocolId: string;
};

export function ProtocolStudyMedsPanel({ protocolId }: Props) {
  const { isReadOnly } = useRole();
  const [medications, setMedications] = useState<ProtocolStudyMedication[]>([]);
  const [lots, setLots] = useState<MedicationLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [strength, setStrength] = useState("");
  const [form, setForm] = useState("");
  const [unit, setUnit] = useState("tabletas");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [medRes, lotRes] = await Promise.all([
      fetch(`/api/pharmacy/medications?protocol_id=${protocolId}`),
      fetch(`/api/pharmacy/lots?protocol_id=${protocolId}`),
    ]);
    const medJson = await readJsonResponse<{
      medications?: ProtocolStudyMedication[];
      error?: string;
    }>(medRes);
    const lotJson = await readJsonResponse<{ lots?: MedicationLot[]; error?: string }>(
      lotRes
    );
    if (!medRes.ok) throw new Error(medJson?.error ?? "No se pudieron cargar medicamentos.");
    if (!lotRes.ok) throw new Error(lotJson?.error ?? "No se pudieron cargar lotes.");
    setMedications(medJson?.medications ?? []);
    setLots(lotJson?.lots ?? []);
  }, [protocolId]);

  useEffect(() => {
    load()
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Error de farmacia.")
      )
      .finally(() => setLoading(false));
  }, [load]);

  async function onAddMedication(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/pharmacy/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          protocol_id: protocolId,
          name,
          strength,
          form,
          unit,
        }),
      });
      const json = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo agregar el medicamento.");
      setName("");
      setStrength("");
      setForm("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar el medicamento.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Cargando medicamentos del protocolo…" />;

  return (
    <div className="space-y-4">
      {error ? <ErrorState message={error} /> : null}

      {!isReadOnly ? (
        <Card>
          <CardHeader
            title="Medicamento del protocolo"
            description="El que envía la farmacéutica para este estudio."
          />
          <CardBody>
            <form
              onSubmit={onAddMedication}
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
            >
              <TextInput
                label="Nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="p. ej. Molecula-X"
              />
              <TextInput
                label="Potencia"
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
                placeholder="10 mg"
              />
              <TextInput
                label="Forma"
                value={form}
                onChange={(e) => setForm(e.target.value)}
                placeholder="tableta"
              />
              <TextInput
                label="Unidad"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
              <div className="flex items-end">
                <Button type="submit" disabled={saving} className="w-full">
                  Agregar
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : null}

      {medications.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-indigo-800">
              Todavía no hay medicamentos de estudio. Agregá el producto y después
              el número de lote que llegó de la farmacéutica.
            </p>
          </CardBody>
        </Card>
      ) : (
        medications.map((medication) => (
          <MedicationLotCard
            key={medication.id}
            medication={medication}
            lots={lots.filter((lot) => lot.study_medication_id === medication.id)}
            readOnly={isReadOnly}
            onChanged={load}
            onError={setError}
          />
        ))
      )}
    </div>
  );
}

function MedicationLotCard({
  medication,
  lots,
  readOnly,
  onChanged,
  onError,
}: {
  medication: ProtocolStudyMedication;
  lots: MedicationLot[];
  readOnly: boolean;
  onChanged: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const [lotNumber, setLotNumber] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function onReceive(event: FormEvent) {
    event.preventDefault();
    if (!lotNumber.trim() || !quantity) return;
    setSaving(true);
    onError(null);
    try {
      const res = await fetch("/api/pharmacy/lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          study_medication_id: medication.id,
          lot_number: lotNumber,
          expires_on: expiresOn || null,
          quantity_received: quantity,
          notes,
        }),
      });
      const json = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo registrar el lote.");
      setLotNumber("");
      setExpiresOn("");
      setQuantity("");
      setNotes("");
      await onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo registrar el lote.");
    } finally {
      setSaving(false);
    }
  }

  const onHand = lots.reduce((sum, lot) => sum + Number(lot.quantity_on_hand), 0);

  return (
    <Card>
      <CardHeader
        title={`${medication.name}${medication.strength ? ` · ${medication.strength}` : ""}`}
        description={`${medication.form || "Medicamento de estudio"} · stock ${formatQuantity(onHand, medication.unit)}`}
      />
      <CardBody className="space-y-4">
        {!readOnly ? (
          <form onSubmit={onReceive} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <TextInput
              label="Número de lote"
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
              required
              placeholder="Lote de la farmacéutica"
            />
            <TextInput
              label="Vence"
              type="date"
              value={expiresOn}
              onChange={(e) => setExpiresOn(e.target.value)}
            />
            <TextInput
              label={`Cantidad recibida (${medication.unit})`}
              type="number"
              min="0.01"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
            <TextInput
              label="Notas"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Remisión, guía…"
            />
            <div className="flex items-end">
              <Button type="submit" disabled={saving} className="w-full">
                Registrar lote
              </Button>
            </div>
          </form>
        ) : null}

        {lots.length === 0 ? (
          <p className="text-sm text-indigo-800">Sin lotes recibidos todavía.</p>
        ) : (
          <ul className="divide-y divide-violet-100">
            {lots.map((lot) => {
              const low = isLowStock(Number(lot.quantity_on_hand), Number(lot.quantity_received));
              return (
                <li
                  key={lot.id}
                  className="flex flex-col gap-1 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-indigo-950">
                      Lote {lot.lot_number}
                      {lot.expires_on ? ` · vence ${lot.expires_on}` : ""}
                    </p>
                    {lot.notes ? (
                      <p className="text-xs text-slate-500">{lot.notes}</p>
                    ) : null}
                  </div>
                  <p className={low ? "font-semibold text-rose-700" : "text-indigo-800"}>
                    {formatQuantity(Number(lot.quantity_on_hand), medication.unit)} /{" "}
                    {formatQuantity(Number(lot.quantity_received), medication.unit)}
                    {low ? " · stock bajo" : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
