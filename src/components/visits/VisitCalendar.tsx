"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SelectInput, TextInput } from "@/components/ui/Field";
import { ErrorState, LoadingState } from "@/components/ui/StateMessage";
import { RoleGuard } from "@/components/rbac/RoleGuard";
import { usePatients } from "@/hooks/usePatients";
import { useProtocols } from "@/hooks/useProtocols";
import { useRole } from "@/contexts/role-context";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import {
  VISIT_STATUS_LABELS,
  VISIT_TYPE_LABELS,
} from "@/lib/visits/labels";
import type { StudyVisit, VisitStatus, VisitType } from "@/lib/types";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function monthRange(cursor: Date) {
  const from = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);
  return { from: from.toISOString(), to: to.toISOString() };
}

function cellsForMonth(cursor: Date) {
  const first = startOfMonth(cursor);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: Array<{ date: Date | null; key: string }> = [];
  for (let i = 0; i < offset; i += 1) {
    cells.push({ date: null, key: `pad-${i}` });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(cursor.getFullYear(), cursor.getMonth(), day);
    cells.push({ date, key: date.toISOString() });
  }
  return cells;
}

function sameDay(iso: string, date: Date) {
  const d = new Date(iso);
  return (
    d.getFullYear() === date.getFullYear() &&
    d.getMonth() === date.getMonth() &&
    d.getDate() === date.getDate()
  );
}

export function VisitCalendar() {
  const { hasPermission, isReadOnly } = useRole();
  const canWrite = hasPermission("screenings:write") && !isReadOnly;
  const { patients } = usePatients();
  const { protocols } = useProtocols();
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [visits, setVisits] = useState<StudyVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StudyVisit | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    patientId: "",
    protocolId: "",
    visitType: "pre_screening" as VisitType,
    scheduledAt: "",
    notes: "",
    status: "scheduled" as VisitStatus,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { from, to } = monthRange(cursor);
    try {
      const res = await fetch(
        `/api/visits?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        { credentials: "include" }
      );
      const data = await readJsonResponse<{ visits?: StudyVisit[]; error?: string }>(res);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo cargar la agenda.");
      setVisits(data?.visits ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar visitas.");
    } finally {
      setLoading(false);
    }
  }, [cursor]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const cells = useMemo(() => cellsForMonth(cursor), [cursor]);
  const monthLabel = cursor.toLocaleDateString("es-419", {
    month: "long",
    year: "numeric",
  });

  function openCreate(date?: Date) {
    const base = date ?? new Date();
    const scheduled = new Date(base);
    if (!date) scheduled.setHours(9, 0, 0, 0);
    else scheduled.setHours(9, 0, 0, 0);
    setEditing(null);
    setForm({
      patientId: patients[0]?.id ?? "",
      protocolId: "",
      visitType: "pre_screening",
      scheduledAt: toLocalInputValue(scheduled.toISOString()),
      notes: "",
      status: "scheduled",
    });
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(visit: StudyVisit) {
    setEditing(visit);
    setForm({
      patientId: visit.patient_id,
      protocolId: visit.protocol_id ?? "",
      visitType: visit.visit_type,
      scheduledAt: toLocalInputValue(visit.scheduled_at),
      notes: visit.notes ?? "",
      status: visit.status,
    });
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        const res = await fetch(`/api/visits/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            visitType: form.visitType,
            scheduledAt: new Date(form.scheduledAt).toISOString(),
            notes: form.notes,
            status: form.status,
            protocolId: form.protocolId || null,
          }),
        });
        const data = await readJsonResponse<{ error?: string }>(res);
        if (!res.ok) throw new Error(data?.error ?? "No se pudo actualizar.");
      } else {
        const res = await fetch("/api/visits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            patientId: form.patientId,
            protocolId: form.protocolId || null,
            visitType: form.visitType,
            scheduledAt: new Date(form.scheduledAt).toISOString(),
            notes: form.notes,
          }),
        });
        const data = await readJsonResponse<{ error?: string }>(res);
        if (!res.ok) throw new Error(data?.error ?? "No se pudo crear la visita.");
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editing) return;
    if (!confirm("¿Quitar esta visita de la agenda?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/visits/${editing.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo borrar.");
      setFormOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al borrar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setCursor((c) => addMonths(c, -1))}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Mes anterior
          </Button>
          <p className="min-w-40 text-center text-sm font-semibold capitalize text-slate-800">
            {monthLabel}
          </p>
          <Button variant="secondary" onClick={() => setCursor((c) => addMonths(c, 1))}>
            Mes siguiente
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <RoleGuard permission="screenings:write">
          <Button onClick={() => openCreate()}>
            <Plus className="h-4 w-4" aria-hidden />
            Nueva visita
          </Button>
        </RoleGuard>
      </div>

      {loading ? (
        <LoadingState label="Cargando agenda…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-violet-100 bg-violet-50/60 text-center text-[11px] font-semibold uppercase tracking-wide text-violet-700">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-1 py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((cell) => {
              const dayVisits = cell.date
                ? visits.filter((v) => sameDay(v.scheduled_at, cell.date as Date))
                : [];
              const isToday =
                cell.date &&
                sameDay(new Date().toISOString(), cell.date);
              return (
                <div
                  key={cell.key}
                  className={cn(
                    "min-h-28 border-b border-r border-violet-50 p-1.5",
                    !cell.date && "bg-slate-50/60"
                  )}
                >
                  {cell.date ? (
                    <>
                      <div className="mb-1 flex items-center justify-between">
                        <span
                          className={cn(
                            "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                            isToday
                              ? "bg-violet-600 text-white"
                              : "text-slate-600"
                          )}
                        >
                          {cell.date.getDate()}
                        </span>
                        {canWrite ? (
                          <button
                            type="button"
                            className="text-violet-400 hover:text-violet-700"
                            onClick={() => openCreate(cell.date ?? undefined)}
                            aria-label="Agregar visita"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                      <div className="space-y-1">
                        {dayVisits.map((visit) => (
                          <button
                            key={visit.id}
                            type="button"
                            onClick={() => openEdit(visit)}
                            className={cn(
                              "block w-full truncate rounded px-1.5 py-1 text-left text-[11px] leading-tight",
                              visit.status === "completed" && "bg-emerald-50 text-emerald-800",
                              visit.status === "no_show" && "bg-rose-50 text-rose-800",
                              visit.status === "cancelled" && "bg-slate-100 text-slate-500 line-through",
                              visit.status === "scheduled" && "bg-violet-50 text-violet-900"
                            )}
                          >
                            {new Date(visit.scheduled_at).toLocaleTimeString("es-419", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            {visit.patients
                              ? `${visit.patients.last_name}`
                              : "Paciente"}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {formOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
          <Card className="w-full max-w-lg p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <CalendarDays className="h-4 w-4 text-violet-500" aria-hidden />
              {editing ? "Editar visita" : "Nueva visita"}
            </h2>
            <div className="mt-4 grid gap-3">
              <SelectInput
                label="Paciente"
                value={form.patientId}
                disabled={Boolean(editing)}
                onChange={(e) => setForm({ ...form, patientId: e.target.value })}
              >
                <option value="">Selecciona</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.last_name}, {p.first_name}
                  </option>
                ))}
              </SelectInput>
              <SelectInput
                label="Protocolo (opcional)"
                value={form.protocolId}
                onChange={(e) => setForm({ ...form, protocolId: e.target.value })}
              >
                <option value="">Sin protocolo</option>
                {protocols.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code_name} · {p.title}
                  </option>
                ))}
              </SelectInput>
              <SelectInput
                label="Tipo"
                value={form.visitType}
                onChange={(e) =>
                  setForm({ ...form, visitType: e.target.value as VisitType })
                }
              >
                {Object.entries(VISIT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectInput>
              <TextInput
                label="Fecha y hora"
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              />
              {editing ? (
                <SelectInput
                  label="Estado"
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as VisitStatus })
                  }
                >
                  {Object.entries(VISIT_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SelectInput>
              ) : null}
              <TextInput
                label="Notas"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              {formError ? (
                <p className="text-xs text-rose-600" role="alert">
                  {formError}
                </p>
              ) : null}
              <div className="flex flex-wrap justify-end gap-2">
                {editing && canWrite ? (
                  <Button variant="danger" disabled={saving} onClick={() => void handleDelete()}>
                    Quitar
                  </Button>
                ) : null}
                <Button variant="secondary" onClick={() => setFormOpen(false)}>
                  Cerrar
                </Button>
                {canWrite ? (
                  <Button disabled={saving || !form.patientId} onClick={() => void handleSave()}>
                    {saving ? "Guardando…" : "Guardar"}
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}
