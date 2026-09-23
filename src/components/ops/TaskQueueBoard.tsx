"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/StateMessage";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import { useRole } from "@/contexts/role-context";

type TaskRow = {
  id: string;
  kind: "inbox" | "yellow" | "rematch";
  title: string;
  detail: string;
  initials: string;
  href: string;
  status: "pending" | "in_progress" | "done";
  due_at: string;
};

const KIND_LABEL = {
  inbox: "Inbox",
  yellow: "Criterio 🟡",
  rematch: "Re-match",
} as const;

const STATUS_LABEL = {
  pending: "Pendiente",
  in_progress: "En curso",
  done: "Hecha",
} as const;

export function TaskQueueBoard() {
  const { isReadOnly } = useRole();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/ops/tasks");
    const json = await readJsonResponse<{ tasks?: TaskRow[]; error?: string }>(res);
    if (!res.ok) throw new Error(json?.error ?? "No se pudo cargar la cola.");
    setTasks(json?.tasks ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      setLoading(true);
      try {
        if (!isReadOnly) {
          await fetch("/api/ops/tasks", { method: "POST" });
        }
        if (!cancelled) await load();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar tareas.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [isReadOnly, load]);

  async function refresh() {
    setLoading(true);
    try {
      if (!isReadOnly) {
        const res = await fetch("/api/ops/tasks", { method: "POST" });
        const json = await readJsonResponse<{ error?: string }>(res);
        if (!res.ok) throw new Error(json?.error ?? "No se pudo actualizar.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar.");
    } finally {
      setLoading(false);
    }
  }

  async function patch(id: string, body: { status?: string; take?: boolean }) {
    setError(null);
    const res = await fetch("/api/ops/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    const json = await readJsonResponse<{ error?: string }>(res);
    if (!res.ok) {
      setError(json?.error ?? "No se pudo actualizar la tarea.");
      return;
    }
    await load();
  }

  const visible = tasks.filter((task) => showDone || task.status !== "done");

  if (loading && tasks.length === 0) {
    return <LoadingState label="Armando la cola de trabajo…" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className="h-4 w-4" aria-hidden />
          Actualizar cola
        </Button>
        <Button variant="ghost" onClick={() => setShowDone((value) => !value)}>
          {showDone ? "Ocultar hechas" : "Ver hechas"}
        </Button>
      </div>
      {error ? <ErrorState message={error} /> : null}
      {visible.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-indigo-800">
              No hay tareas abiertas. Cuando entre un candidato, falte un criterio o haya un screen failure, queda acá aunque cierres el chat.
            </p>
          </CardBody>
        </Card>
      ) : (
        <ul className="space-y-3">
          {visible.map((task) => (
            <li key={task.id}>
              <Card>
                <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-violet-600">
                      {KIND_LABEL[task.kind]} · {STATUS_LABEL[task.status]} · vence{" "}
                      {new Date(task.due_at).toLocaleDateString("es")}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-indigo-950">{task.title}</p>
                    <p className="mt-1 text-xs text-indigo-700">{task.detail}</p>
                    <Link href={task.href} className="mt-2 inline-block text-xs font-medium text-violet-700 underline">
                      Abrir en la app
                    </Link>
                  </div>
                  {isReadOnly || task.status === "done" ? (
                    task.status === "done" && !isReadOnly ? (
                      <Button variant="secondary" onClick={() => void patch(task.id, { status: "pending" })}>
                        Reabrir
                      </Button>
                    ) : null
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => void patch(task.id, { take: true })}>
                        Tomar
                      </Button>
                      <Button onClick={() => void patch(task.id, { status: "done" })}>Hecha</Button>
                    </div>
                  )}
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
