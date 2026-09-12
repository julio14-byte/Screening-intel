"use client";

import { useCallback, useEffect, useState } from "react";
import { Users } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { APP_ROLE_LABELS, type ProtocolAssignmentMember } from "@/lib/rbac/types";
import { readJsonResponse } from "@/lib/http/readJsonResponse";

export function ProtocolAssignmentPanel({ protocolId }: { protocolId: string }) {
  const [members, setMembers] = useState<ProtocolAssignmentMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/protocols/${protocolId}/assignments`, {
        credentials: "include",
      });
      const data = await readJsonResponse<{
        members?: ProtocolAssignmentMember[];
        error?: string;
      }>(res);
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudo cargar el equipo del protocolo.");
      }
      setMembers(data?.members ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar asignaciones.");
    } finally {
      setLoading(false);
    }
  }, [protocolId]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  async function toggle(member: ProtocolAssignmentMember, assigned: boolean) {
    setPendingId(member.user_id);
    setError(null);
    try {
      const res = await fetch(`/api/protocols/${protocolId}/assignments`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.user_id, assigned }),
      });
      const data = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudo actualizar la asignación.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al asignar.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Card className="mb-4">
      <CardHeader
        title="Equipo del protocolo"
        description="Solo las personas asignadas (más el PI del centro) ven este estudio, su matching y su tracker."
        actions={<Users className="h-4 w-4 text-slate-400" aria-hidden />}
      />
      <CardBody>
        {loading ? (
          <p className="text-xs text-slate-500">Cargando equipo…</p>
        ) : (
          <ul className="space-y-2">
            {members.map((member) => (
              <li
                key={member.user_id}
                className="flex items-start justify-between gap-3 rounded-md border border-slate-100 px-3 py-2"
              >
                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={member.assigned}
                    disabled={pendingId === member.user_id}
                    onChange={(e) => void toggle(member, e.target.checked)}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-800">
                      {member.full_name ?? member.email ?? member.user_id.slice(0, 8)}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {APP_ROLE_LABELS[member.clinical_role]}
                      {member.email ? ` · ${member.email}` : ""}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {error ? (
          <p className="mt-2 text-xs text-rose-600" role="alert">
            {error}
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}
