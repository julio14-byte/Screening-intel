import { createScreeningLangChainTools } from "../src/lib/agents/langchain-tools";
import { SYSTEM_PROMPT } from "../src/lib/agents/screening-graph";
import {
  draftOutreachTemplate,
  mapInboxItem,
  mapRematchItem,
  mapYellowItem,
  OUTREACH_KINDS,
  OUTREACH_TEMPLATES,
  type ScreeningRow,
  type SubmissionRow,
} from "../src/lib/queue/coordinatorQueue";

let failed = 0;

function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

function assertNoPhi(payload: unknown, names: string[], message: string) {
  const blob = JSON.stringify(payload);
  for (const name of names) {
    if (blob.includes(name)) {
      console.error(`FAIL: ${message} — filtró ${JSON.stringify(name)}`);
      failed += 1;
    }
  }
}

const inboxRow: SubmissionRow = {
  id: "sub-1",
  first_name: "María",
  last_name: "García",
  status: "pending",
  created_at: "2026-09-20T10:00:00.000Z",
  contact_phone: "+52 55 1234 5678",
  match_results: [{ protocol_code: "ONC-01", verdict: "pending", score: 70 }],
};

const inbox = mapInboxItem(inboxRow);
assert(inbox.initials === "M. G.", `inbox iniciales: ${inbox.initials}`);
assert(inbox.has_phone === true, "inbox debe marcar has_phone");
assert(inbox.href === "/candidatos", "inbox href");
assert(inbox.top_protocol === "ONC-01", "inbox protocolo");
assert(!("contact_phone" in inbox), "inbox no debe exponer contact_phone");
assert(!("first_name" in inbox), "inbox no debe exponer first_name");
assertNoPhi(inbox, ["María", "García", "55 1234"], "mapInboxItem");

const yellowComplete: ScreeningRow = {
  id: "scr-1",
  patient_id: "pat-1",
  protocol_id: "prot-1",
  status: "pre_screening",
  match_details: [
    { type: "inclusion", criterion: "Edad 18-75", status: "pass", detail: "ok" },
  ],
  patients: { first_name: "Ana", last_name: "López", clinic_id: "org-1" },
  protocols: { code_name: "DM-02", title: "Diabetes" },
};
assert(mapYellowItem(yellowComplete) === null, "🟡 sin missing debe omitirse");

const yellowMissing: ScreeningRow = {
  ...yellowComplete,
  match_details: [
    { type: "inclusion", criterion: "HbA1c", status: "missing", detail: "falta lab" },
    { type: "inclusion", criterion: "Edad 18-75", status: "pass", detail: "ok" },
  ],
};
const yellow = mapYellowItem(yellowMissing);
assert(yellow?.initials === "A. L.", `yellow iniciales: ${yellow?.initials}`);
assert(yellow?.missing.includes("HbA1c") === true, "yellow debe listar HbA1c");
assert(yellow?.href === "/patients/pat-1", "yellow href");
assertNoPhi(yellow, ["Ana", "López"], "mapYellowItem");

const rematch = mapRematchItem({
  id: "scr-2",
  patient_id: "pat-2",
  protocol_id: "prot-2",
  status: "screen_failure",
  patients: { first_name: "Juan", last_name: "Pérez", clinic_id: "org-1" },
  protocols: { code_name: "ONC-01", title: "Oncología" },
});
assert(rematch?.initials === "J. P.", `rematch iniciales: ${rematch?.initials}`);
assert(rematch?.href === "/rematch", "rematch href");
assert(rematch?.failed_protocol === "ONC-01", "rematch protocolo");
assertNoPhi(rematch, ["Juan", "Pérez"], "mapRematchItem");
assert(mapRematchItem({ ...yellowComplete, patients: null }) === null, "rematch sin paciente");

for (const kind of OUTREACH_KINDS) {
  const draft = draftOutreachTemplate(kind, "M. G.");
  assert(draft.sent === false, `${kind} no debe enviarse`);
  assert(draft.message === OUTREACH_TEMPLATES[kind], `${kind} plantilla`);
  assert(draft.initials === "M. G.", `${kind} iniciales`);
  assert(draft.href === "/candidatos", `${kind} href`);
}

const requiredPrompt = [
  "agente de cola",
  "Nunca cambies elegibilidad",
  "getCoordinatorQueue",
  "draftOutreachTemplate",
  "iniciales",
  "No envíes WhatsApp",
];
for (const fragment of requiredPrompt) {
  assert(
    SYSTEM_PROMPT.includes(fragment),
    `SYSTEM_PROMPT debe incluir ${JSON.stringify(fragment)}`
  );
}

const tools = createScreeningLangChainTools("org-test");
const names = tools.map((tool) => tool.name);
assert(names.includes("getCoordinatorQueue"), "tool getCoordinatorQueue");
assert(names.includes("draftOutreachTemplate"), "tool draftOutreachTemplate");

if (failed) {
  process.exit(1);
}

console.log("verify-queue-agent: cola, plantillas y prompt OK");
