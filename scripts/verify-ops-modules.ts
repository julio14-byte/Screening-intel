import {
  buildOperationalFunnel,
  dueAtForKind,
  openTaskKey,
  overdueDedupeKey,
  screeningUpdateConflict,
  VISIT_KIND_LABEL,
  VISIT_NOTES_MAX,
} from "../src/lib/ops/model";

let failed = 0;

function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

const from = new Date("2026-09-23T12:00:00.000Z");
assert(dueAtForKind("inbox", from) === "2026-09-24T12:00:00.000Z", "inbox vence en 1 día");
assert(dueAtForKind("yellow", from) === "2026-09-25T12:00:00.000Z", "yellow vence en 2 días");
assert(dueAtForKind("rematch", from) === "2026-09-26T12:00:00.000Z", "rematch vence en 3 días");
assert(openTaskKey("inbox", "abc") === "inbox:abc", "clave de tarea");
assert(screeningUpdateConflict(0) === true, "0 filas es conflicto");
assert(screeningUpdateConflict(1) === false, "1 fila no es conflicto");
assert(
  overdueDedupeKey("task-1", from) === "overdue:task-1:2026-09-23",
  "dedupe de vencida"
);

const funnel = buildOperationalFunnel({
  capture: 4,
  preScreening: 3,
  screening: 2,
  randomized: 1,
  recover: 5,
});
assert(
  funnel.stages.map((stage) => stage.key).join(",") ===
    "capture,pre_screening,screening,randomized",
  "orden del embudo"
);
assert(funnel.recover.key === "recover", "screen failure queda aparte");
assert(funnel.recover.href === "/rematch", "recuperar va a re-match");
assert(!funnel.stages.some((stage) => stage.key === "recover"), "recover no es etapa");
assert(VISIT_KIND_LABEL.consulta === "Consulta médica", "tipo consulta");
assert(VISIT_NOTES_MAX >= 4000, "notas clínicas largas");

if (failed) process.exit(1);
console.log("verify-ops-modules: embudo, vencimientos y conflicto OK");
