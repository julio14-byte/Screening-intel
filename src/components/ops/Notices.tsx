"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/StateMessage";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import { cn } from "@/lib/utils";

type Notice = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string;
  created_at: string;
  read: boolean;
};

const KIND_LABEL: Record<string, string> = {
  inbox_new: "Candidato",
  screen_failure: "Screen failure",
  task_overdue: "Vencida",
};

export function useNotices() {
  const [items, setItems] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const res = await fetch("/api/ops/notifications");
    const json = await readJsonResponse<{
      items?: Notice[];
      unread?: number;
      error?: string;
    }>(res);
    if (!res.ok) throw new Error(json?.error ?? "No se pudieron cargar los avisos.");
    setItems(json?.items ?? []);
    setUnread(json?.unread ?? 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    reload()
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error de avisos.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  async function mark(body: { id?: string; all?: boolean }) {
    const res = await fetch("/api/ops/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await readJsonResponse<{ error?: string }>(res);
    if (!res.ok) throw new Error(json?.error ?? "No se pudo marcar el aviso.");
    await reload();
  }

  return { items, unread, error, loading, mark, setError };
}

export function NotificationBell() {
  const { unread } = useNotices();
  return (
    <Link
      href="/avisos"
      className="relative inline-flex items-center justify-center rounded-lg p-2 text-indigo-800 hover:bg-violet-50"
      aria-label={unread > 0 ? `${unread} avisos sin leer` : "Avisos"}
    >
      <Bell className="h-5 w-5" aria-hidden />
      {unread > 0 ? (
        <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}

export function NoticeList() {
  const { items, unread, error, loading, mark, setError } = useNotices();

  if (loading) return <LoadingState label="Cargando avisos…" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-indigo-700">{unread} sin leer</p>
        <Button
          variant="secondary"
          disabled={unread === 0}
          onClick={() => {
            setError(null);
            void mark({ all: true }).catch((err) =>
              setError(err instanceof Error ? err.message : "Error")
            );
          }}
        >
          Marcar leídos
        </Button>
      </div>
      {error ? <ErrorState message={error} /> : null}
      {items.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-indigo-800">
              Sin avisos. Aparecen cuando entra un candidato o hay un screen failure.
            </p>
          </CardBody>
        </Card>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Card className={cn(!item.read && "ring-1 ring-violet-300")}>
                <CardBody className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs text-violet-600">
                      {KIND_LABEL[item.kind] ?? item.kind} ·{" "}
                      {new Date(item.created_at).toLocaleString("es")}
                    </p>
                    <p className="text-sm font-semibold text-indigo-950">{item.title}</p>
                    <p className="text-xs text-indigo-700">{item.body}</p>
                    <Link href={item.href} className="mt-1 inline-block text-xs font-medium text-violet-700 underline">
                      Ir
                    </Link>
                  </div>
                  {!item.read ? (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setError(null);
                        void mark({ id: item.id }).catch((err) =>
                          setError(err instanceof Error ? err.message : "Error")
                        );
                      }}
                    >
                      Leído
                    </Button>
                  ) : null}
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
