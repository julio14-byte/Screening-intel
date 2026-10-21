"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { TextInput } from "@/components/ui/Field";
import { ErrorState, LoadingState } from "@/components/ui/StateMessage";
import { useRole } from "@/contexts/role-context";
import { useProtocols } from "@/hooks/useProtocols";
import { useSiteProfile } from "@/hooks/useSiteProfile";
import { useTeam } from "@/hooks/useTeam";
import { downloadCsv } from "@/lib/export/dashboardCsv";
import { toErrorMessage } from "@/lib/errors";
import { siteFileSlug } from "@/lib/site/profile";
import {
  buildTeamAlerts,
  credentialState,
  DELEGABLE_TASKS,
  delegationLogToCsv,
  isDelegationActive,
  STAFF_ROLES,
  STAFF_ROLE_LABELS,
  TASK_LABELS,
  type AlertSeverity,
  type CredentialState,
  type DelegableTask,
  type StaffMember,
  type StaffRole,
} from "@/lib/team/team";
import { cn } from "@/lib/utils";

const ALERT_STYLE: Record<AlertSeverity, string> = {
  critical: "bg-rose-50 text-rose-900",
  warning: "bg-amber-50 text-amber-950",
  info: "bg-slate-100 text-slate-700",
};

const CREDENTIAL_STYLE: Record<CredentialState, string> = {
  none: "text-slate-400",
  valid: "text-emerald-700",
  expiring: "text-amber-700",
  expired: "font-medium text-rose-700",
};

const selectClass =
  "w-full rounded-md border border-violet-200 bg-white px-2.5 py-1.5 text-sm text-indigo-950 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500";

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function Expiry({ value }: { value: string | null }) {
  const { state, daysLeft } = credentialState(value);
  if (state === "none") return <span className="text-slate-400">—</span>;
  return (
    <span className={cn("tabular-nums", CREDENTIAL_STYLE[state])}>
      {value}
      {state === "expired" ? " · vencida" : state === "expiring" ? ` · ${daysLeft} d` : ""}
    </span>
  );
}

type StaffDraft = {
  id?: string;
  full_name: string;
  role_title: StaffRole;
  email: string;
  professional_license: string;
  gcp_expires_on: string;
  license_expires_on: string;
  active: boolean;
};

const emptyStaff = (): StaffDraft => ({
  full_name: "",
  role_title: "coordinator",
  email: "",
  professional_license: "",
  gcp_expires_on: "",
  license_expires_on: "",
  active: true,
});

export function TeamView() {
  const { staff, delegations, loading, error, saveStaff, addDelegation, endDelegation } =
    useTeam();
  const { protocols } = useProtocols();
  const { site } = useSiteProfile();
  const { hasPermission } = useRole();
  const canManage = hasPermission("roles:manage");

  const [staffForm, setStaffForm] = useState<StaffDraft | null>(null);
  const [delegStaff, setDelegStaff] = useState("");
  const [delegProtocol, setDelegProtocol] = useState("");
  const [delegTasks, setDelegTasks] = useState<DelegableTask[]>([]);
  const [delegDate, setDelegDate] = useState(todayIso());
  const [protocolFilter, setProtocolFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const alerts = useMemo(
    () =>
      buildTeamAlerts(
        staff,
        delegations,
        protocols.map((p) => ({ id: p.id, code_name: p.code_name, status: p.status }))
      ),
    [staff, delegations, protocols]
  );

  const staffById = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff]);
  const protocolById = useMemo(() => new Map(protocols.map((p) => [p.id, p])), [protocols]);
  const visibleDelegations = delegations
    .filter((d) => !protocolFilter || d.protocol_id === protocolFilter)
    .sort((a, b) => b.delegated_on.localeCompare(a.delegated_on));

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
    } catch (e) {
      setActionError(toErrorMessage(e, "No se pudo completar la acción."));
    } finally {
      setBusy(false);
    }
  };

  const submitStaff = () =>
    run(async () => {
      if (!staffForm) return;
      await saveStaff({
        id: staffForm.id,
        full_name: staffForm.full_name,
        role_title: staffForm.role_title,
        email: staffForm.email || null,
        professional_license: staffForm.professional_license || null,
        gcp_expires_on: staffForm.gcp_expires_on || null,
        license_expires_on: staffForm.license_expires_on || null,
        active: staffForm.active,
      });
      setStaffForm(null);
    });

  const submitDelegation = () =>
    run(async () => {
      await addDelegation({
        staff_id: delegStaff,
        protocol_id: delegProtocol,
        tasks: delegTasks,
        delegated_on: delegDate,
      });
      setDelegTasks([]);
    });

  const edit = (s: StaffMember) =>
    setStaffForm({
      id: s.id,
      full_name: s.full_name,
      role_title: s.role_title,
      email: s.email ?? "",
      professional_license: s.professional_license ?? "",
      gcp_expires_on: s.gcp_expires_on ?? "",
      license_expires_on: s.license_expires_on ?? "",
      active: s.active,
    });

  if (loading) return <LoadingState label="Cargando equipo…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-5">
      {actionError ? <ErrorState message={actionError} /> : null}

      {alerts.length > 0 ? (
        <ul className="space-y-1.5" aria-label="Alertas del equipo">
          {alerts.map((a, i) => (
            <li key={i} className={cn("rounded-md px-3 py-2 text-xs", ALERT_STYLE[a.severity])}>
              {a.message}
            </li>
          ))}
        </ul>
      ) : null}

      <Card>
        <CardHeader
          title="Personal del sitio"
          description="Vigencia de capacitación GCP y licencia profesional."
          actions={
            canManage && !staffForm ? (
              <Button variant="secondary" onClick={() => setStaffForm(emptyStaff())}>
                Agregar persona
              </Button>
            ) : null
          }
        />
        <CardBody className="space-y-4">
          {staffForm ? (
            <div className="space-y-3 rounded-md bg-violet-50/60 p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput
                  label="Nombre completo"
                  maxLength={160}
                  value={staffForm.full_name}
                  onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })}
                />
                <label className="space-y-1 text-xs font-medium text-slate-700">
                  Rol
                  <select
                    className={selectClass}
                    value={staffForm.role_title}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, role_title: e.target.value as StaffRole })
                    }
                  >
                    {STAFF_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {STAFF_ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </label>
                <TextInput
                  label="Correo"
                  type="email"
                  maxLength={320}
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                />
                <TextInput
                  label="Cédula o licencia profesional"
                  maxLength={60}
                  value={staffForm.professional_license}
                  onChange={(e) =>
                    setStaffForm({ ...staffForm, professional_license: e.target.value })
                  }
                />
                <TextInput
                  label="Vigencia de capacitación GCP"
                  type="date"
                  value={staffForm.gcp_expires_on}
                  onChange={(e) => setStaffForm({ ...staffForm, gcp_expires_on: e.target.value })}
                />
                <TextInput
                  label="Vigencia de licencia"
                  type="date"
                  value={staffForm.license_expires_on}
                  onChange={(e) =>
                    setStaffForm({ ...staffForm, license_expires_on: e.target.value })
                  }
                />
              </div>
              {staffForm.id ? (
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={staffForm.active}
                    onChange={(e) => setStaffForm({ ...staffForm, active: e.target.checked })}
                  />
                  Activo en el sitio
                </label>
              ) : null}
              <div className="flex gap-2">
                <Button onClick={() => void submitStaff()} disabled={busy}>
                  {busy ? "Guardando…" : "Guardar"}
                </Button>
                <Button variant="ghost" onClick={() => setStaffForm(null)} disabled={busy}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : null}

          {staff.length === 0 ? (
            <p className="text-sm text-slate-500">Aún no hay personal registrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-xs">
                <thead className="text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-1 pr-2 font-medium">Persona</th>
                    <th className="px-2 py-1 font-medium">Rol</th>
                    <th className="px-2 py-1 font-medium">Licencia</th>
                    <th className="px-2 py-1 font-medium">GCP vence</th>
                    <th className="px-2 py-1 font-medium">Licencia vence</th>
                    <th className="py-1 pl-2" />
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => (
                    <tr
                      key={s.id}
                      className={cn("border-t border-slate-100", !s.active && "opacity-60")}
                    >
                      <td className="py-1.5 pr-2 font-medium text-slate-900">
                        {s.full_name}
                        {!s.active ? (
                          <span className="ml-1 text-[10px] uppercase text-slate-400">baja</span>
                        ) : null}
                      </td>
                      <td className="px-2 py-1.5 text-slate-700">{STAFF_ROLE_LABELS[s.role_title]}</td>
                      <td className="px-2 py-1.5 text-slate-700">{s.professional_license || "—"}</td>
                      <td className="px-2 py-1.5">
                        <Expiry value={s.gcp_expires_on} />
                      </td>
                      <td className="px-2 py-1.5">
                        <Expiry value={s.license_expires_on} />
                      </td>
                      <td className="py-1.5 pl-2 text-right">
                        {canManage ? (
                          <Button variant="ghost" onClick={() => edit(s)}>
                            Editar
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Bitácora de delegación"
          description="Tareas que el investigador principal delega a cada persona, por protocolo."
          actions={
            visibleDelegations.length > 0 ? (
              <Button
                variant="secondary"
                onClick={() =>
                  downloadCsv(
                    `${siteFileSlug(site) || "sitio"}-delegacion-${todayIso()}.csv`,
                    delegationLogToCsv(visibleDelegations, staff, protocols, site)
                  )
                }
              >
                <Download className="h-4 w-4" aria-hidden />
                Exportar CSV
              </Button>
            ) : null
          }
        />
        <CardBody className="space-y-4">
          {canManage ? (
            <div className="space-y-3 rounded-md bg-violet-50/60 p-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1 text-xs font-medium text-slate-700">
                  Persona
                  <select
                    className={selectClass}
                    value={delegStaff}
                    onChange={(e) => setDelegStaff(e.target.value)}
                  >
                    <option value="">Elegir…</option>
                    {staff
                      .filter((s) => s.active)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-700">
                  Protocolo
                  <select
                    className={selectClass}
                    value={delegProtocol}
                    onChange={(e) => setDelegProtocol(e.target.value)}
                  >
                    <option value="">Elegir…</option>
                    {protocols.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code_name}
                      </option>
                    ))}
                  </select>
                </label>
                <TextInput
                  label="Delegado desde"
                  type="date"
                  value={delegDate}
                  onChange={(e) => setDelegDate(e.target.value)}
                />
              </div>
              <fieldset>
                <legend className="text-xs font-medium text-slate-700">Tareas</legend>
                <div className="mt-1 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                  {DELEGABLE_TASKS.map((task) => (
                    <label key={task} className="flex items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={delegTasks.includes(task)}
                        onChange={(e) =>
                          setDelegTasks((prev) =>
                            e.target.checked ? [...prev, task] : prev.filter((t) => t !== task)
                          )
                        }
                      />
                      {TASK_LABELS[task]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <Button
                onClick={() => void submitDelegation()}
                disabled={busy || !delegStaff || !delegProtocol || delegTasks.length === 0}
              >
                Delegar
              </Button>
            </div>
          ) : null}

          <label className="block text-xs font-medium text-slate-600">
            Filtrar por protocolo
            <select
              className={cn(selectClass, "mt-1 w-64 max-w-full")}
              value={protocolFilter}
              onChange={(e) => setProtocolFilter(e.target.value)}
            >
              <option value="">Todos</option>
              {protocols.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code_name}
                </option>
              ))}
            </select>
          </label>

          {visibleDelegations.length === 0 ? (
            <p className="text-sm text-slate-500">Sin delegaciones registradas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-left text-xs">
                <thead className="text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-1 pr-2 font-medium">Protocolo</th>
                    <th className="px-2 py-1 font-medium">Persona</th>
                    <th className="px-2 py-1 font-medium">Tareas</th>
                    <th className="px-2 py-1 font-medium">Desde</th>
                    <th className="px-2 py-1 font-medium">Hasta</th>
                    <th className="py-1 pl-2" />
                  </tr>
                </thead>
                <tbody>
                  {visibleDelegations.map((d) => {
                    const active = isDelegationActive(d);
                    return (
                      <tr key={d.id} className="border-t border-slate-100 align-top">
                        <td className="py-1.5 pr-2 text-slate-800">
                          {protocolById.get(d.protocol_id)?.code_name ?? "—"}
                        </td>
                        <td className="px-2 py-1.5 font-medium text-slate-900">
                          {staffById.get(d.staff_id)?.full_name ?? "—"}
                        </td>
                        <td className="px-2 py-1.5 text-slate-700">
                          {d.tasks.map((t) => TASK_LABELS[t]).join(", ")}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums text-slate-700">{d.delegated_on}</td>
                        <td className="px-2 py-1.5 tabular-nums text-slate-700">
                          {d.ended_on ?? (active ? "Vigente" : "—")}
                        </td>
                        <td className="py-1.5 pl-2 text-right">
                          {canManage && !d.ended_on ? (
                            <Button
                              variant="ghost"
                              disabled={busy}
                              onClick={() => void run(() => endDelegation(d.id, todayIso()))}
                            >
                              Terminar hoy
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
