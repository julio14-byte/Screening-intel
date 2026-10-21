import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildEnrollmentProgress,
  enrollmentTargetSchema,
  isPaceAlert,
} from "../src/lib/enrollment/targets";
import type { ScreeningStatus } from "../src/lib/types";

const read = (path: string) => readFileSync(resolve(path), "utf8");
let failed = 0;
function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

const P = "11111111-1111-4111-8111-111111111111";
const rows = (spec: Partial<Record<ScreeningStatus, number>>, protocol = P) =>
  Object.entries(spec).flatMap(([status, n]) =>
    Array.from({ length: n as number }, () => ({
      protocol_id: protocol,
      status: status as ScreeningStatus,
    }))
  );

const day = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
};

const target = (n: number, start: string | null, end: string | null) => [
  { protocol_id: P, target_randomized: n, start_date: start, end_date: end },
];

// Ventana de 100 días, a mitad de camino se esperan 50 de 100.
const window = ["2026-01-01", "2026-04-10"] as const;
const mid = day("2026-02-19");

const onTrack = buildEnrollmentProgress(target(100, ...window), rows({ randomized: 48, screen_failure: 20 }), mid)[0];
assert(onTrack.pace === "on_track", "48 de 50 esperados está en ritmo");
assert(onTrack.percent === 48 && onTrack.remaining === 52, "porcentaje y faltantes");
assert(onTrack.daysTotal === 100 && onTrack.daysElapsed === 50, "días totales y transcurridos");
assert(onTrack.expectedByNow === 50, "esperados a la fecha");
assert(onTrack.projectedFinish !== null && onTrack.projectedFinish > "2026-04-10", "proyección con ritmo ligeramente bajo cae después del cierre");

const behind = buildEnrollmentProgress(target(100, ...window), rows({ randomized: 35 }), mid)[0];
assert(behind.pace === "behind", "35 de 50 esperados está atrasado");
assert(isPaceAlert(behind.pace), "atrasado genera alerta");

const risk = buildEnrollmentProgress(target(100, ...window), rows({ randomized: 10 }), mid)[0];
assert(risk.pace === "at_risk", "10 de 50 esperados está en riesgo");

const done = buildEnrollmentProgress(target(10, ...window), rows({ randomized: 10 }), mid)[0];
assert(done.pace === "complete" && done.remaining === 0 && done.percent === 100, "meta cumplida");
assert(done.neededInScreening === 0 && done.projectedFinish === null, "meta cumplida no pide más sujetos");

const over = buildEnrollmentProgress(target(100, ...window), rows({ randomized: 50 }), day("2026-05-01"))[0];
assert(over.pace === "overdue" && over.daysLeft === 0, "ventana vencida sin meta");

const early = buildEnrollmentProgress(target(100, ...window), rows({}), day("2025-12-01"))[0];
assert(early.pace === "not_started", "aún no inicia");
assert(!isPaceAlert(early.pace), "no iniciar no es alerta");

const noWindow = buildEnrollmentProgress(target(20, null, null), rows({ randomized: 5 }), mid)[0];
assert(noWindow.pace === "no_window" && noWindow.expectedByNow === null, "sin ventana solo muestra avance");

const dayOne = buildEnrollmentProgress(target(100, "2026-02-19", "2026-05-29"), rows({}), mid)[0];
assert(dayOne.pace === "on_track", "primer día sin randomizados no es alerta");

const conv = buildEnrollmentProgress(
  target(20, ...window),
  rows({ randomized: 6, screen_failure: 6, screening: 4 }),
  mid
)[0];
assert(conv.conversion === 0.5, "conversión = randomizados / cerrados");
assert(conv.remaining === 14 && conv.neededInScreening === 24, "sujetos por sumar = faltantes/conversión − en curso");

const fewClosed = buildEnrollmentProgress(target(20, ...window), rows({ randomized: 1, screen_failure: 1 }), mid)[0];
assert(fewClosed.conversion === null && fewClosed.neededInScreening === null, "no estima conversión con menos de 3 cerrados");

const other = buildEnrollmentProgress(
  target(10, null, null),
  [...rows({ randomized: 3 }), ...rows({ randomized: 9 }, "22222222-2222-4222-8222-222222222222")],
  mid
)[0];
assert(other.randomized === 3, "no mezcla screenings de otros protocolos");

assert(enrollmentTargetSchema.safeParse({ protocol_id: P, target_randomized: 10, start_date: "2026-01-01", end_date: "2026-06-01" }).success, "meta válida");
assert(!enrollmentTargetSchema.safeParse({ protocol_id: P, target_randomized: 0, start_date: null, end_date: null }).success, "rechaza meta 0");
assert(!enrollmentTargetSchema.safeParse({ protocol_id: P, target_randomized: 1.5, start_date: null, end_date: null }).success, "rechaza meta decimal");
assert(!enrollmentTargetSchema.safeParse({ protocol_id: P, target_randomized: 5, start_date: "2026-06-01", end_date: "2026-01-01" }).success, "rechaza cierre anterior al inicio");
assert(!enrollmentTargetSchema.safeParse({ protocol_id: "x", target_randomized: 5, start_date: null, end_date: null }).success, "rechaza protocolo inválido");
assert(!enrollmentTargetSchema.safeParse({ protocol_id: P, target_randomized: 5, start_date: "2026-13-45", end_date: null }).success, "rechaza fecha inexistente");

const migration = read("supabase/migrations/20261021080000_enrollment_targets.sql");
assert(/enable row level security/.test(migration), "migración con RLS");
assert(/can_write_clinical_data/.test(migration), "escritura limitada a roles clínicos");
assert(/audit\.capture_row_change/.test(migration), "auditoría de cambios de metas");
assert(/revoke all on table public\.protocol_enrollment_targets from anon/.test(migration), "anon sin acceso");
assert(read("src/lib/rbac/permissions.ts").includes('"/api/enrollment-targets"'), "monitor bloqueado en escrituras de metas");
assert(read("src/components/dashboard/DashboardView.tsx").includes("EnrollmentGoals"), "metas visibles en el dashboard");
assert(read("src/components/dashboard/EnrollmentGoals.tsx").includes("isReadOnly"), "monitor no ve controles de edición");

if (failed > 0) process.exit(1);
console.log("verify-enrollment-targets: meta, ritmo, conversión y permisos OK");
