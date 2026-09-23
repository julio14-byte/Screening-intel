"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SelectInput, TextInput } from "@/components/ui/Field";
import { ErrorState } from "@/components/ui/StateMessage";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import { formatQuantity, PRESCRIPTION_STATUS_LABEL } from "@/lib/pharmacy/model";
import type { MedicationLot, Protocol, ProtocolStudyMedication } from "@/lib/types";
import { useRole } from "@/contexts/role-context";

type RxRow = {
  id: string;
  quantity: number;
  directions: string;
  status: "draft" | "delivered" | "cancelled";
  created_at: string;
  delivered_at: string | null;
  protocol_study_medications: { name: string; strength: string; unit: string } | { name: string; strength: string; unit: string }[] | null;
  medication_lots: { lot_number: string } | { lot_number: string }[] | null;
  protocols: { code_name: string } | { code_name: string }[] | null;
};

function firstRel<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function ElectronicPrescriptionPanel({
  patientId,
  protocols,
}: {
  patientId: string;
  protocols: Protocol[];
}) {
  const { isReadOnly } = useRole();
  const [medications, setMedications] = useState<ProtocolStudyMedication[]>([]);
  const [lots, setLots] = useState<MedicationLot[]>([]);
  const [prescriptions, setPrescriptions] = useState<RxRow[]>([]);
  const [protocolId, setProtocolId] = useState("");
  const [medicationId, setMedicationId] = useState("");
  const [lotId, setLotId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [directions, setDirections] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadPrescriptions = useCallback(async () => {
    const res = await fetch(`/api/pharmacy/prescriptions?patient_id=${patientId}`);
    const json = await readJsonResponse<{ prescriptions?: RxRow[]; error?: string }>(res);
    if (!res.ok) throw new Error(json?.error ?? "No se pudieron cargar las recetas.");
    setPrescriptions(json?.prescriptions ?? []);
  }, [patientId]);

  useEffect(() => {
    loadPrescriptions().catch((err) =>
      setError(err instanceof Error ? err.message : "Error de recetas.")
    );
  }, [loadPrescriptions]);

  useEffect(() => {
    if (!protocolId) {
      setMedications([]);
      setLots([]);
      setMedicationId("");
      setLotId("");
      return;
    }
    Promise.all([
      fetch(`/api/pharmacy/medications?protocol_id=${protocolId}`).then((res) =>
        readJsonResponse<{ medications?: ProtocolStudyMedication[]; error?: string }>(res).then(
          (json) => {
            if (!res.ok) throw new Error(json?.error ?? "No se pudieron cargar medicamentos.");
            return json?.medications ?? [];
          }
        )
      ),
      fetch(`/api/pharmacy/lots?protocol_id=${protocolId}`).then((res) =>
        readJsonResponse<{ lots?: MedicationLot[]; error?: string }>(res).then((json) => {
          if (!res.ok) throw new Error(json?.error ?? "No se pudieron cargar lotes.");
          return json?.lots ?? [];
        })
      ),
    ])
      .then(([nextMeds, nextLots]) => {
        setMedications(nextMeds);
        setLots(nextLots);
        setMedicationId("");
        setLotId("");
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Error de farmacia.")
      );
  }, [protocolId]);

  const lotsForMed = useMemo(
    () =>
      lots.filter(
        (lot) =>
          lot.study_medication_id === medicationId && Number(lot.quantity_on_hand) > 0
      ),
    [lots, medicationId]
  );

  const selectedMed = medications.find((med) => med.id === medicationId);
  const selectedLot = lotsForMed.find((lot) => lot.id === lotId);

  async function onDeliver(event: FormEvent) {
    event.preventDefault();
    if (!protocolId || !medicationId || !lotId || !quantity) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/pharmacy/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          protocol_id: protocolId,
          study_medication_id: medicationId,
          lot_id: lotId,
          quantity,
          directions,
          deliver: true,
        }),
      });
      const json = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo entregar la receta.");
      setQuantity("");
      setDirections("");
      setLotId("");
      await loadPrescriptions();
      const lotRes = await fetch(`/api/pharmacy/lots?protocol_id=${protocolId}`);
      const lotJson = await readJsonResponse<{ lots?: MedicationLot[] }>(lotRes);
      setLots(lotJson?.lots ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entregar la receta.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader
        title="Receta electrónica"
        description="Al entregar se descuenta el inventario del lote del medicamento."
      />
      <CardBody className="space-y-4">
        {error ? <ErrorState message={error} /> : null}

        {!isReadOnly ? (
          <form onSubmit={onDeliver} className="grid gap-3 sm:grid-cols-2">
            <SelectInput
              label="Protocolo"
              value={protocolId}
              onChange={(e) => setProtocolId(e.target.value)}
              required
            >
              <option value="">Seleccionar protocolo</option>
              {protocols.map((protocol) => (
                <option key={protocol.id} value={protocol.id}>
                  {protocol.code_name} — {protocol.title}
                </option>
              ))}
            </SelectInput>
            <SelectInput
              label="Medicamento"
              value={medicationId}
              onChange={(e) => {
                setMedicationId(e.target.value);
                setLotId("");
              }}
              required
              disabled={!protocolId}
            >
              <option value="">Seleccionar medicamento</option>
              {medications.map((med) => (
                <option key={med.id} value={med.id}>
                  {med.name}
                  {med.strength ? ` ${med.strength}` : ""}
                </option>
              ))}
            </SelectInput>
            <SelectInput
              label="Lote"
              value={lotId}
              onChange={(e) => setLotId(e.target.value)}
              required
              disabled={!medicationId}
              hint={
                selectedLot
                  ? `Disponible: ${formatQuantity(Number(selectedLot.quantity_on_hand), selectedMed?.unit)}`
                  : undefined
              }
            >
              <option value="">Seleccionar lote con stock</option>
              {lotsForMed.map((lot) => (
                <option key={lot.id} value={lot.id}>
                  {lot.lot_number} · {formatQuantity(Number(lot.quantity_on_hand), selectedMed?.unit)}
                  {lot.expires_on ? ` · vence ${lot.expires_on}` : ""}
                </option>
              ))}
            </SelectInput>
            <TextInput
              label={selectedMed ? `Cantidad (${selectedMed.unit})` : "Cantidad"}
              type="number"
              min="0.01"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
            <div className="sm:col-span-2">
              <TextInput
                label="Indicaciones"
                value={directions}
                onChange={(e) => setDirections(e.target.value)}
                placeholder="1 tableta cada 12 horas"
              />
            </div>
            <div>
              <Button type="submit" disabled={saving}>
                Entregar receta
              </Button>
            </div>
          </form>
        ) : null}

        {prescriptions.length === 0 ? (
          <p className="text-sm text-indigo-800">
            Este paciente todavía no tiene recetas electrónicas del estudio.
          </p>
        ) : (
          <ul className="divide-y divide-violet-100">
            {prescriptions.map((rx) => {
              const med = firstRel(rx.protocol_study_medications);
              const lot = firstRel(rx.medication_lots);
              const protocol = firstRel(rx.protocols);
              return (
                <li key={rx.id} className="py-2 text-sm text-indigo-900">
                  <span className="font-medium">{med?.name ?? "Medicamento"}</span>
                  {med?.strength ? ` ${med.strength}` : ""} · lote{" "}
                  {lot?.lot_number ?? "—"} ·{" "}
                  {formatQuantity(Number(rx.quantity), med?.unit)} ·{" "}
                  {protocol?.code_name ?? "Protocolo"} ·{" "}
                  {PRESCRIPTION_STATUS_LABEL[rx.status]}
                  {rx.directions ? ` · ${rx.directions}` : ""}
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
