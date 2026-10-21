import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildTeamAlerts,
  credentialState,
  delegationLogToCsv,
  delegationSchema,
  endDelegationSchema,
  isDelegationActive,
  staffSchema,
  type Delegation,
  type StaffMember,
} from "../src/lib/team/team";
import { emptySiteProfile } from "../src/lib/site/profile";

const read = (path: string) => readFileSync(resolve(path), "utf8");
let failed = 0;
function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

const today = new Date(2026, 2, 10, 12);
const U = (n: number) => `${n}`.padStart(8, "0") + "-0000-4000-8000-000000000000";

const staff = (
  n: number,
  name: string,
  over: Partial<StaffMember> = {}
): StaffMember => ({
  id: U(n),
  full_name: name,
  role_title: "coordinator",
  email: null,
  professional_license: null,
  gcp_expires_on: "2027-01-01",
  license_expires_on: null,
  active: true,
  ...over,
});
const deleg = (n: number, staffN: number, protocol: string, over: Partial<Delegation> = {}): Delegation => ({
  id: U(100 + n),
  staff_id: U(staffN),
  protocol_id: protocol,
  tasks: ["consent"],
  delegated_on: "2026-01-01",
  ended_on: null,
  ...over,
});

assert(credentialState(null, today).state === "none", "sin fecha no tiene vigencia");
assert(credentialState("2026-03-09", today).state === "expired", "ayer está vencida");
assert(credentialState("2026-03-10", today).state === "expiring", "hoy aún vale pero vence ya");
assert(credentialState("2026-05-09", today).state === "expiring" && credentialState("2026-05-09", today).daysLeft === 60, "60 días es por vencer");
assert(credentialState("2026-05-10", today).state === "valid", "61 días es vigente");

assert(isDelegationActive(deleg(1, 1, "p"), today), "delegación abierta está vigente");
assert(!isDelegationActive(deleg(1, 1, "p", { ended_on: "2026-03-09" }), today), "delegación terminada ayer no está vigente");
assert(isDelegationActive(deleg(1, 1, "p", { ended_on: "2026-03-10" }), today), "termina hoy aún está vigente");
assert(!isDelegationActive(deleg(1, 1, "p", { delegated_on: "2026-03-11" }), today), "delegación futura no está vigente");

const crit = buildTeamAlerts(
  [staff(1, "Ana", { gcp_expires_on: "2026-02-01" })],
  [deleg(1, 1, "p1")],
  [],
  today
);
assert(crit[0]?.severity === "critical" && /GCP vencida/.test(crit[0].message), "GCP vencida con tareas delegadas es crítica");

const warnNoDeleg = buildTeamAlerts([staff(1, "Ana", { gcp_expires_on: "2026-02-01" })], [], [], today);
assert(warnNoDeleg[0]?.severity === "warning", "GCP vencida sin delegación es advertencia");

const expiring = buildTeamAlerts([staff(1, "Ana", { gcp_expires_on: "2026-04-01" })], [], [], today);
assert(expiring.length === 1 && /vence en 22 días/.test(expiring[0].message), "GCP por vencer avisa los días");

const noGcp = buildTeamAlerts([staff(1, "Ana", { gcp_expires_on: null })], [deleg(1, 1, "p1")], [], today);
assert(noGcp.some((a) => a.severity === "warning" && /no se registró/.test(a.message)), "delegado sin GCP registrado advierte");
assert(buildTeamAlerts([staff(1, "Ana", { gcp_expires_on: null })], [], [], today).length === 0, "sin delegación y sin GCP no molesta");

const licenseExpired = buildTeamAlerts(
  [staff(1, "Ana", { license_expires_on: "2026-01-01" })],
  [deleg(1, 1, "p1")],
  [],
  today
);
assert(licenseExpired.some((a) => a.severity === "critical" && /licencia/.test(a.message)), "licencia vencida con delegación es crítica");

const inactive = buildTeamAlerts([staff(1, "Beto", { active: false })], [deleg(1, 1, "p1")], [], today);
assert(inactive.some((a) => a.severity === "critical" && /dado de baja/.test(a.message)), "baja con delegación vigente es crítica");
assert(
  buildTeamAlerts([staff(1, "Beto", { active: false })], [deleg(1, 1, "p1", { ended_on: "2026-02-01" })], [], today).length === 0,
  "baja con delegación cerrada no alerta"
);

const uncovered = buildTeamAlerts(
  [staff(1, "Ana")],
  [deleg(1, 1, "p1")],
  [
    { id: "p1", code_name: "P1", status: "active" },
    { id: "p2", code_name: "P2", status: "active" },
    { id: "p3", code_name: "P3", status: "closed" },
  ],
  today
);
assert(uncovered.length === 1 && /P2 no tiene delegaciones/.test(uncovered[0].message), "avisa protocolos activos sin delegaciones");

const mixed = buildTeamAlerts(
  [staff(1, "Ana", { gcp_expires_on: "2026-02-01" }), staff(2, "Beto", { gcp_expires_on: "2026-04-01" })],
  [deleg(1, 1, "p1")],
  [{ id: "p9", code_name: "P9", status: "active" }],
  today
);
assert(mixed.map((a) => a.severity).join() === "critical,warning,info", "orden: crítico, advertencia, informativo");

const P1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
assert(delegationSchema.safeParse({ staff_id: U(1), protocol_id: P1, tasks: ["consent", "consent", "ecg"] }).success, "delegación válida");
assert(
  JSON.stringify(delegationSchema.parse({ staff_id: U(1), protocol_id: P1, tasks: ["consent", "consent"] }).tasks) === '["consent"]',
  "quita tareas repetidas"
);
assert(!delegationSchema.safeParse({ staff_id: U(1), protocol_id: P1, tasks: [] }).success, "exige al menos una tarea");
assert(!delegationSchema.safeParse({ staff_id: U(1), protocol_id: P1, tasks: ["hackear"] }).success, "rechaza tareas fuera del catálogo");
assert(endDelegationSchema.safeParse({ id: U(1), ended_on: "2026-03-10" }).success, "cierre válido");
assert(!endDelegationSchema.safeParse({ id: U(1), ended_on: "mañana" }).success, "cierre con fecha inválida");
assert(staffSchema.safeParse({ full_name: "Ana Soto", role_title: "nurse", email: "", gcp_expires_on: "2027-01-01" }).success, "persona válida");
assert(!staffSchema.safeParse({ full_name: "A", role_title: "nurse" }).success, "rechaza nombre corto");
assert(!staffSchema.safeParse({ full_name: "Ana Soto", role_title: "dios" }).success, "rechaza rol desconocido");
assert(!staffSchema.safeParse({ full_name: "Ana Soto", role_title: "nurse", email: "no-es-correo" }).success, "rechaza correo inválido");

const csv = delegationLogToCsv(
  [deleg(1, 1, "p1", { tasks: ["consent", "ecg"], ended_on: "2026-02-01" })],
  [staff(1, "=Ana", { professional_license: "123", gcp_expires_on: "2027-01-01" })],
  [{ id: "p1", code_name: "P1", title: "Estudio" }],
  { ...emptySiteProfile(), site_name: "Centro Reforma", pi_name: "Dra. Soto" },
  new Date("2026-03-10T00:00:00Z")
);
assert(csv.startsWith("Bitácora de delegación,Centro Reforma"), "CSV con encabezado del sitio");
assert(csv.includes("Consentimiento informado; Electrocardiograma"), "CSV con tareas legibles");
assert(csv.includes("'=Ana"), "CSV neutraliza fórmulas");
assert(csv.includes("2026-01-01,2026-02-01,2027-01-01"), "CSV con vigencias");

const migration = read("supabase/migrations/20261021100000_site_team_delegation.sql");
assert((migration.match(/enable row level security/g) ?? []).length === 2, "RLS en ambas tablas");
assert(/can_manage_clinical_roles/.test(migration), "solo el investigador administra");
assert(/grant update \(ended_on\) on table public\.delegation_assignments/.test(migration), "la delegación solo permite cerrar con fecha");
assert(!/grant[^;]*delete[^;]*(site_staff|delegation_assignments)/i.test(migration), "sin borrado");
assert(/tasks <@ array/.test(migration), "tareas restringidas al catálogo en BD");
assert(/audit\.capture_row_change/.test(migration), "auditoría de cambios");
assert(read("src/lib/rbac/permissions.ts").includes('"/api/team"'), "monitor bloqueado en escrituras del equipo");
assert(read("src/app/api/team/staff/route.ts").includes('"roles:manage"'), "API de personal exige investigador");
assert(read("src/app/api/team/delegations/route.ts").includes('"roles:manage"'), "API de delegaciones exige investigador");
assert(read("src/config.ts").includes('href: "/equipo"'), "equipo en navegación");

if (failed > 0) process.exit(1);
console.log("verify-team-delegation: vigencias, alertas de delegación y permisos OK");
