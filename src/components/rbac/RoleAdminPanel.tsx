"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Shield, UserCog } from "lucide-react";
import {
  assignClinicalRoleAction,
  getMembersWithRolesAction,
} from "@/actions/rbac";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/StateMessage";
import {
  APP_ROLE_DESCRIPTIONS,
  APP_ROLE_LABELS,
  type AppRole,
  type OrganizationMemberWithRole,
} from "@/lib/rbac/types";

const ROLES: AppRole[] = ["investigator", "coordinator", "monitor"];

export function RoleAdminPanel() {
  const [members, setMembers] = useState<OrganizationMemberWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getMembersWithRolesAction();
    if (result.ok) {
      setMembers(result.members);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function handleAssign(userId: string, role: AppRole) {
    setMessage(null);
    startTransition(async () => {
      const result = await assignClinicalRoleAction({ userId, role });
      if (result.ok) {
        setMessage("Rol actualizado correctamente.");
        await load();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader
        title="Roles clínicos del sitio"
        description="Asigná permisos según la función de cada miembro (RBAC / GCP)."
        actions={<UserCog className="h-4 w-4 text-slate-400" aria-hidden />}
      />
      <CardBody>
        {loading ? (
          <LoadingState label="Cargando miembros…" />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <>
            {message ? (
              <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                {message}
              </p>
            ) : null}

            <div className="mb-4 grid gap-2 sm:grid-cols-3">
              {ROLES.map((role) => (
                <div
                  key={role}
                  className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <Shield className="h-3.5 w-3.5" aria-hidden />
                    {APP_ROLE_LABELS[role]}
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-slate-500">
                    {APP_ROLE_DESCRIPTIONS[role]}
                  </p>
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-md border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Usuario</th>
                    <th className="px-3 py-2 font-medium">Rol org.</th>
                    <th className="px-3 py-2 font-medium">Rol clínico</th>
                    <th className="px-3 py-2 font-medium">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((member) => (
                    <tr key={member.user_id}>
                      <td className="px-3 py-2">
                        <p className="font-medium text-slate-900">
                          {member.full_name ?? member.email ?? member.user_id.slice(0, 8)}
                        </p>
                        {member.email ? (
                          <p className="text-xs text-slate-500">{member.email}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600">
                        {member.org_role}
                      </td>
                      <td className="px-3 py-2">
                        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-800">
                          {APP_ROLE_LABELS[member.clinical_role]}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                          value={member.clinical_role}
                          disabled={pending}
                          onChange={(e) =>
                            handleAssign(
                              member.user_id,
                              e.target.value as AppRole
                            )
                          }
                          aria-label={`Rol clínico de ${member.email ?? member.user_id}`}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {APP_ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {members.length === 0 ? (
              <p className="mt-4 text-center text-xs text-slate-500">
                No hay miembros en la organización.
              </p>
            ) : null}

            <div className="mt-4 flex justify-end">
              <Button variant="secondary" onClick={() => void load()} disabled={pending}>
                Actualizar lista
              </Button>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
