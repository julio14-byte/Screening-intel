"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/StateMessage";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import {
  formatQuantity,
  isLowStock,
  MOVEMENT_KIND_LABEL,
  PRESCRIPTION_STATUS_LABEL,
} from "@/lib/pharmacy/model";
import { toPatientInitials } from "@/lib/utils";

type Rel<T> = T | T[] | null;

function firstRel<T>(value: Rel<T>): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

type LotRow = {
  id: string;
  protocol_id: string;
  lot_number: string;
  expires_on: string | null;
  quantity_received: number;
  quantity_on_hand: number;
  protocol_study_medications: Rel<{
    name: string;
    strength: string;
    unit: string;
  }>;
  protocols: Rel<{ code_name: string; title: string }>;
};

type MovementRow = {
  id: string;
  kind: "receive" | "dispense" | "adjust";
  quantity_delta: number;
  quantity_after: number;
  note: string;
  created_at: string;
};

type RxRow = {
  id: string;
  quantity: number;
  status: "draft" | "delivered" | "cancelled";
  created_at: string;
  patients: Rel<{ first_name: string; last_name: string }>;
  protocol_study_medications: Rel<{ name: string; unit: string }>;
  medication_lots: Rel<{ lot_number: string }>;
  protocols: Rel<{ code_name: string }>;
};

export function InventoryBoard() {
  const [lots, setLots] = useState<LotRow[]>([]);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [prescriptions, setPrescriptions] = useState<RxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/pharmacy/inventory");
    const json = await readJsonResponse<{
      lots?: LotRow[];
      movements?: MovementRow[];
      prescriptions?: RxRow[];
      error?: string;
    }>(res);
    if (!res.ok) throw new Error(json?.error ?? "No se pudo cargar el inventario.");
    setLots(json?.lots ?? []);
    setMovements(json?.movements ?? []);
    setPrescriptions(json?.prescriptions ?? []);
  }, []);

  useEffect(() => {
    load()
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Error de inventario.")
      )
      .finally(() => setLoading(false));
  }, [load]);

  if (loading) return <LoadingState label="Cargando inventario…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Stock por lote"
          description="Lo que llegó de la farmacéutica y lo que queda en el site."
        />
        <CardBody>
          {lots.length === 0 ? (
            <p className="text-sm text-indigo-800">
              No hay lotes. Abrí un protocolo y registrá el medicamento y el número
              de lote.
            </p>
          ) : (
            <ul className="divide-y divide-violet-100">
              {lots.map((lot) => {
                const med = firstRel(lot.protocol_study_medications);
                const protocol = firstRel(lot.protocols);
                const low = isLowStock(
                  Number(lot.quantity_on_hand),
                  Number(lot.quantity_received)
                );
                return (
                  <li
                    key={lot.id}
                    className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-indigo-950">
                        {med?.name ?? "Medicamento"}
                        {med?.strength ? ` ${med.strength}` : ""} · lote{" "}
                        {lot.lot_number}
                      </p>
                      <p className="text-xs text-slate-500">
                        <Link
                          href={`/protocols/${lot.protocol_id}`}
                          className="text-violet-700 hover:underline"
                        >
                          {protocol?.code_name ?? "Protocolo"}
                        </Link>
                        {lot.expires_on ? ` · vence ${lot.expires_on}` : ""}
                      </p>
                    </div>
                    <p
                      className={
                        low
                          ? "text-sm font-semibold text-rose-700"
                          : "text-sm text-indigo-800"
                      }
                    >
                      {formatQuantity(Number(lot.quantity_on_hand), med?.unit)} /{" "}
                      {formatQuantity(Number(lot.quantity_received), med?.unit)}
                      {low ? " · stock bajo" : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Recetas recientes"
          description="Al entregar se descuenta el lote del medicamento."
        />
        <CardBody>
          {prescriptions.length === 0 ? (
            <p className="text-sm text-indigo-800">
              Todavía no hay recetas. Se emiten desde el expediente del paciente.
            </p>
          ) : (
            <ul className="divide-y divide-violet-100">
              {prescriptions.map((rx) => {
                const patient = firstRel(rx.patients);
                const med = firstRel(rx.protocol_study_medications);
                const lot = firstRel(rx.medication_lots);
                const protocol = firstRel(rx.protocols);
                return (
                  <li key={rx.id} className="py-2 text-sm text-indigo-900">
                    <span className="font-medium">
                      {patient
                        ? toPatientInitials(patient.first_name, patient.last_name)
                        : "Paciente"}
                    </span>{" "}
                    · {med?.name ?? "Medicamento"} · lote {lot?.lot_number ?? "—"} ·{" "}
                    {formatQuantity(Number(rx.quantity), med?.unit)} ·{" "}
                    {protocol?.code_name ?? "Protocolo"} ·{" "}
                    {PRESCRIPTION_STATUS_LABEL[rx.status]}
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Kardex" description="Recepciones y entregas." />
        <CardBody>
          {movements.length === 0 ? (
            <p className="text-sm text-indigo-800">Sin movimientos todavía.</p>
          ) : (
            <ul className="divide-y divide-violet-100">
              {movements.map((move) => (
                <li key={move.id} className="py-2 text-sm text-indigo-900">
                  {MOVEMENT_KIND_LABEL[move.kind]} ·{" "}
                  {move.quantity_delta > 0 ? "+" : ""}
                  {formatQuantity(Number(move.quantity_delta))} → queda{" "}
                  {formatQuantity(Number(move.quantity_after))}
                  {move.note ? ` · ${move.note}` : ""}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
