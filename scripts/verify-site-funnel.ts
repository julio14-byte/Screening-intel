import { computeSiteFunnel, formatDurationHours } from "../src/lib/dashboard/computeSiteFunnel";

const now = new Date("2026-09-14T12:00:00.000Z");

const snapshot = computeSiteFunnel({
  now,
  submissions: [
    {
      id: "c1",
      status: "pending",
      created_at: "2026-09-12T10:00:00.000Z",
      converted_patient_id: null,
      first_name: "Ana",
      last_name: "Ruiz",
    },
    {
      id: "c2",
      status: "converted",
      created_at: "2026-09-10T10:00:00.000Z",
      converted_patient_id: "p1",
      first_name: "Luis",
      last_name: "Mora",
    },
    {
      id: "c3",
      status: "converted",
      created_at: "2026-08-01T10:00:00.000Z",
      converted_patient_id: "p-old",
      first_name: "Old",
      last_name: "Lead",
    },
  ],
  visits: [
    {
      id: "v1",
      patient_id: "p1",
      scheduled_at: "2026-09-13T15:00:00.000Z",
      status: "completed",
      visit_type: "pre_screening",
    },
  ],
  screenings: [
    {
      id: "s1",
      patient_id: "p1",
      protocol_id: "prot-a",
      status: "screen_failure",
      created_at: "2026-09-11T10:00:00.000Z",
      patientCreatedAt: "2026-09-10T10:00:00.000Z",
      patientName: "Mora, Luis",
      protocolCode: "GLP1",
    },
    {
      id: "s2",
      patient_id: "p1",
      protocol_id: "prot-b",
      status: "pre_screening",
      created_at: "2026-09-12T10:00:00.000Z",
      patientCreatedAt: "2026-09-10T10:00:00.000Z",
      patientName: "Mora, Luis",
      protocolCode: "HTA",
    },
    {
      id: "s3",
      patient_id: "p2",
      protocol_id: "prot-a",
      status: "screen_failure",
      created_at: "2026-09-08T10:00:00.000Z",
      patientCreatedAt: "2026-09-01T10:00:00.000Z",
      patientName: "Díaz, Eva",
      protocolCode: "GLP1",
    },
  ],
  pendingItems: [
    {
      id: "x",
      kind: "overdue_visit",
      title: "Pre-screening vencida",
      detail: "",
      href: "/agenda",
      patientName: "Mora, Luis",
      protocolLabel: null,
      dueAt: "2026-09-13T15:00:00.000Z",
    },
  ],
});

const checks: Array<[string, unknown, unknown]> = [
  ["candidatosWeek", snapshot.candidatosWeek, 2],
  ["convertedWeek", snapshot.convertedWeek, 1],
  ["withVisitWeek", snapshot.withVisitWeek, 1],
  ["visitRatePct", snapshot.visitRatePct, 100],
  ["screenFailurePatients", snapshot.screenFailurePatients, 2],
  ["reassignedPatients", snapshot.reassignedPatients, 1],
  ["reassignRatePct", snapshot.reassignRatePct, 50],
  ["waitingRematch", snapshot.waitingRematch.map((p) => p.patientId).join(","), "p2"],
  ["pendingCount", snapshot.pendingCount, 1],
  ["timeLabel", formatDurationHours(24), "1.0 días"],
];

let failed = 0;
for (const [name, got, expected] of checks) {
  if (got !== expected) {
    console.error(`${name}: ${JSON.stringify(got)} !== ${JSON.stringify(expected)}`);
    failed += 1;
  }
}

if (failed) process.exit(1);
console.log("verify-site-funnel: OK");
