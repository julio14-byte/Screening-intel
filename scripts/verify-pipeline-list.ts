import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RoleProvider } from "../src/contexts/role-context";
import { PipelineList } from "../src/components/tracker/PipelineList";
import { canSetScreeningStatus } from "../src/lib/rbac/screening-transitions";
import type { ScreeningWithRelations } from "../src/lib/types";
import { SCREENING_STATUS_ORDER } from "../src/lib/utils";

const page = readFileSync(resolve("src/app/(app)/tracker/page.tsx"), "utf8");
const list = readFileSync(resolve("src/components/tracker/PipelineList.tsx"), "utf8");
const kanban = readFileSync(resolve("src/components/tracker/KanbanBoard.tsx"), "utf8");

let failed = 0;
function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

assert(page.includes('useState<TrackerView>("kanban")'), "el tablero sigue siendo la vista inicial");
assert(page.includes("KanbanBoard"), "el kanban sigue en la página");
assert(page.includes("PipelineList"), "la lista es la otra vista");
assert(/\bLista\b/.test(page), "el control se llama Lista");
assert(
  page.includes("void handleMove(id, status, failureReason)"),
  "la página reenvía el motivo del screen failure"
);
assert(
  (page.match(/void handleMove\(id, status, failureReason\)/g) ?? []).length === 2,
  "tablero y lista usan el mismo movimiento"
);

assert(list.includes("canSetScreeningStatus"), "la lista respeta el rol");
assert(list.includes('status === "screen_failure"'), "screen failure abre el motivo");
assert(list.includes("trimmed.length < 8"), "el motivo pide al menos 8 caracteres");
assert(list.includes("disabled={!canEdit}"), "sin permiso el selector no cambia la etapa");
assert(list.includes("value={screening.status}"), "cancelar el motivo deja la etapa actual");

assert(kanban.includes("draggable={!readOnly}"), "el kanban conserva el arrastre");
assert(kanban.includes("Motivo del screen failure"), "el kanban conserva su diálogo");
assert(!list.includes("onDragStart"), "la lista no reimplementa el arrastre");

for (const status of SCREENING_STATUS_ORDER) {
  assert(
    canSetScreeningStatus("coordinator", status),
    `coordinador puede marcar ${status}`
  );
  assert(
    !canSetScreeningStatus("monitor", status),
    `monitor no marca ${status}`
  );
}

const sample: ScreeningWithRelations = {
  id: "s1",
  patient_id: "p1",
  protocol_id: "pr1",
  status: "screening",
  match_score: 82.4,
  match_details: [],
  failure_reason: null,
  created_at: "2026-10-20T12:00:00.000Z",
  updated_at: "2026-10-22T12:00:00.000Z",
  patients: {
    id: "p1",
    clinic_id: "c1",
    first_name: "Ana",
    last_name: "Ruiz",
    birth_date: "1980-05-02",
    gender: "female",
    subject_code: "014",
    created_at: "2026-01-01",
  },
  protocols: {
    id: "pr1",
    title: "Diabetes tipo 2",
    code_name: "DM-1",
    status: "active",
  },
};

function renderList(role: "coordinator" | "monitor") {
  return renderToStaticMarkup(
    createElement(
      RoleProvider,
      { role },
      createElement(PipelineList, {
        screenings: [sample],
        onMove: () => undefined,
      })
    )
  );
}

const coordinatorHtml = renderList("coordinator");
assert(coordinatorHtml.includes("Ruiz, Ana"), "la lista muestra al paciente");
assert(coordinatorHtml.includes("DM-1"), "la lista muestra el protocolo");
assert(coordinatorHtml.includes("82%"), "la lista muestra el match");
assert(coordinatorHtml.includes('aria-label="Etapa de Ruiz, Ana"'), "el selector nombra al paciente");
assert(
  coordinatorHtml.includes('value="screening"') ||
    coordinatorHtml.includes('selected=""'),
  "la etapa actual queda seleccionada"
);
assert(!coordinatorHtml.includes("disabled="), "el coordinador puede cambiar la etapa");
assert(coordinatorHtml.includes("Screen Failure"), "screen failure está entre las etapas");
assert(coordinatorHtml.includes("Sujeto 014"), "muestra el código de sujeto");

const monitorHtml = renderList("monitor");
assert(monitorHtml.includes("disabled="), "el monitor no cambia la etapa");
assert(
  monitorHtml.includes("Tu rol ve el pipeline y no cambia la etapa."),
  "el monitor ve que la lista es de consulta"
);
assert(!monitorHtml.includes(">Randomizado<"), "el monitor no recibe las otras etapas");

if (failed) process.exit(1);
console.log("verify-pipeline-list: lista y kanban comparten la etapa OK");
