/** Cierre de protocolo: lock → ciego → análisis descriptivo → CSR → registro regulatorio. */

export const CLOSEOUT_PHASES = [
  "cleaning",
  "locked",
  "unblinded",
  "analyzed",
  "csr",
  "submitted",
] as const;
export type CloseoutPhase = (typeof CLOSEOUT_PHASES)[number];

export const CLOSEOUT_PHASE_LABEL: Record<CloseoutPhase, string> = {
  cleaning: "1. Limpieza de datos",
  locked: "2. Database Lock",
  unblinded: "3. Apertura del ciego",
  analyzed: "4. Análisis descriptivo",
  csr: "5. Informe clínico (CSR)",
  submitted: "6. Sometimiento registrado",
};

export const CLOSEOUT_PHASE_HINT: Record<CloseoutPhase, string> = {
  cleaning:
    "El monitor revisa datos faltantes (presión arterial, visitas abiertas) y abre queries. El centro completa o justifica.",
  locked:
    "La base quedó congelada. Nadie —ni el coordinador, ni el médico, ni la farmacéutica— puede modificar una celda.",
  unblinded:
    "Recién después del lock el sistema cruza kit/código con el brazo. Distinto del desenlace de emergencia IWRS.",
  analyzed:
    "Conteos del centro (n/brazo, EA, adherencia). No reemplaza SAS/R ni el bioestadístico del sponsor.",
  csr: "Borrador técnico del centro: diseño, desviaciones, queries y resultados descriptivos. No es el CSR oficial del sponsor.",
  submitted:
    "Registro de que el expediente se empaquetó para agencias. Crisvia no envía nada a FDA, EMA, COFEPRIS ni ANMAT.",
};

export const REGULATORY_AGENCIES = ["FDA", "EMA", "COFEPRIS", "ANMAT"] as const;
export type RegulatoryAgency = (typeof REGULATORY_AGENCIES)[number];

export const CLOSEOUT_MIGRATION_HINT =
  "Falta aplicar supabase/migrations/20260925040000_protocol_closeout.sql y recargar el schema.";

export const LOCK_ATTESTATION_HINT =
  "Declaro que los datos están limpios y completos. El Database Lock es irreversible.";

export type CloseoutIssue = {
  code: string;
  message: string;
};

export type CloseoutScan = {
  ready: boolean;
  open_queries: number;
  scheduled_visits: number;
  missing_vitals: number;
  issues: CloseoutIssue[];
};

export type CloseoutQueryStatus = "open" | "answered" | "closed";

export type CloseoutQuery = {
  id: string;
  protocol_id: string;
  patient_id: string | null;
  follow_up_visit_id: string | null;
  field_hint: string;
  description: string;
  status: CloseoutQueryStatus;
  answer_notes: string;
  opened_at: string;
};

export type ProtocolCloseout = {
  id: string | null;
  protocol_id: string;
  phase: CloseoutPhase;
  lock_attestation: string;
  locked_at: string | null;
  unblind_reason: string;
  unblinded_at: string | null;
  analysis_snapshot: AnalysisSnapshot | Record<string, never>;
  analyzed_at: string | null;
  csr_markdown: string;
  csr_generated_at: string | null;
  agencies: string[];
  submission_notes: string;
  submitted_at: string | null;
};

export type ArmSnapshot = {
  code: string;
  name: string;
  n: number;
  ae_n: number;
  ae_pct: number | null;
  mean_adherence: number | null;
  deviations: number;
};

export type AnalysisSnapshot = {
  generated_at: string;
  disclaimer: string;
  n_randomized: number;
  n_screen_failure: number;
  n_visits: number;
  n_visits_done: number;
  overall_ae_n: number;
  overall_ae_pct: number | null;
  overall_mean_adherence: number | null;
  overall_deviations: number;
  arms: ArmSnapshot[];
};

export const ANALYSIS_DISCLAIMER =
  "Snapshot descriptivo del centro. No es significancia estadística, no usa SAS ni R y no reemplaza al bioestadístico del sponsor.";

export function isCloseoutPhase(value: string): value is CloseoutPhase {
  return (CLOSEOUT_PHASES as readonly string[]).includes(value);
}

export function phaseIndex(phase: CloseoutPhase): number {
  return CLOSEOUT_PHASES.indexOf(phase);
}

export function phaseReached(current: CloseoutPhase, needed: CloseoutPhase): boolean {
  return phaseIndex(current) >= phaseIndex(needed);
}

export function percent(part: number, total: number): number | null {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return null;
  return Math.round((part / total) * 1000) / 10;
}

export function mean(values: number[]): number | null {
  const clean = values.filter((value) => Number.isFinite(value));
  if (clean.length === 0) return null;
  const sum = clean.reduce((acc, value) => acc + value, 0);
  return Math.round((sum / clean.length) * 10) / 10;
}

export function emptyScan(): CloseoutScan {
  return {
    ready: true,
    open_queries: 0,
    scheduled_visits: 0,
    missing_vitals: 0,
    issues: [],
  };
}

export function normalizeScan(raw: unknown): CloseoutScan {
  if (!raw || typeof raw !== "object") return emptyScan();
  const row = raw as Record<string, unknown>;
  const issues = Array.isArray(row.issues)
    ? row.issues
        .filter((item): item is CloseoutIssue =>
          Boolean(
            item &&
              typeof item === "object" &&
              typeof (item as CloseoutIssue).code === "string" &&
              typeof (item as CloseoutIssue).message === "string"
          )
        )
        .map((item) => ({ code: item.code, message: item.message }))
    : [];
  return {
    ready: row.ready === true && issues.length === 0,
    open_queries: Number(row.open_queries) || 0,
    scheduled_visits: Number(row.scheduled_visits) || 0,
    missing_vitals: Number(row.missing_vitals) || 0,
    issues,
  };
}

export function buildAnalysisSnapshot(input: {
  now?: Date;
  screenFailures: number;
  assignments: Array<{
    patientId: string;
    armCode: string;
    armName: string;
  }>;
  visits: Array<{
    patientId: string;
    status: string;
    adverseEvent: boolean;
    adherencePct: number | null;
    protocolDeviation: boolean;
  }>;
}): AnalysisSnapshot {
  const byArm = new Map<
    string,
    ArmSnapshot & { adherences: number[]; aePatients: Set<string> }
  >();
  for (const row of input.assignments) {
    const key = row.armCode || "sin-brazo";
    const current = byArm.get(key) ?? {
      code: row.armCode || "—",
      name: row.armName || "Sin brazo visible",
      n: 0,
      ae_n: 0,
      ae_pct: null,
      mean_adherence: null,
      deviations: 0,
      adherences: [],
      aePatients: new Set<string>(),
    };
    current.n += 1;
    byArm.set(key, current);
  }

  const armByPatient = new Map(
    input.assignments.map((row) => [row.patientId, row.armCode || "sin-brazo"])
  );

  let deviations = 0;
  const adherences: number[] = [];
  let done = 0;
  const aePatients = new Set<string>();

  for (const visit of input.visits) {
    if (visit.status === "completed" || visit.status === "out_of_window") done += 1;
    if (visit.adverseEvent) aePatients.add(visit.patientId);
    if (visit.protocolDeviation) deviations += 1;
    if (visit.adherencePct != null && Number.isFinite(visit.adherencePct)) {
      adherences.push(visit.adherencePct);
    }
    const armKey = armByPatient.get(visit.patientId);
    if (!armKey) continue;
    const arm = byArm.get(armKey);
    if (!arm) continue;
    if (visit.adverseEvent) arm.aePatients.add(visit.patientId);
    if (visit.protocolDeviation) arm.deviations += 1;
    if (visit.adherencePct != null && Number.isFinite(visit.adherencePct)) {
      arm.adherences.push(visit.adherencePct);
    }
  }

  const arms: ArmSnapshot[] = [...byArm.values()].map((arm) => ({
    code: arm.code,
    name: arm.name,
    n: arm.n,
    ae_n: arm.aePatients.size,
    ae_pct: percent(arm.aePatients.size, arm.n),
    mean_adherence: mean(arm.adherences),
    deviations: arm.deviations,
  }));

  return {
    generated_at: (input.now ?? new Date()).toISOString(),
    disclaimer: ANALYSIS_DISCLAIMER,
    n_randomized: input.assignments.length,
    n_screen_failure: input.screenFailures,
    n_visits: input.visits.length,
    n_visits_done: done,
    overall_ae_n: aePatients.size,
    overall_ae_pct: percent(aePatients.size, input.assignments.length),
    overall_mean_adherence: mean(adherences),
    overall_deviations: deviations,
    arms,
  };
}

export function buildCsrMarkdown(input: {
  protocolCode: string;
  protocolTitle: string;
  closeout: Pick<
    ProtocolCloseout,
    "phase" | "locked_at" | "unblinded_at" | "lock_attestation" | "unblind_reason"
  >;
  snapshot: AnalysisSnapshot;
  queries: Array<{ status: string; description: string; answer_notes: string }>;
  deviations: number;
}): string {
  const arms = input.snapshot.arms
    .map(
      (arm) =>
        `- **${arm.code}** (${arm.name}): n=${arm.n}; EA=${arm.ae_n} (${arm.ae_pct ?? "—"}%); ` +
        `adherencia media=${arm.mean_adherence ?? "—"}%; desviaciones=${arm.deviations}`
    )
    .join("\n");

  const queryLines =
    input.queries.length === 0
      ? "- Sin queries de monitoreo."
      : input.queries
          .map(
            (query) =>
              `- [${query.status}] ${query.description}${
                query.answer_notes ? ` — respuesta: ${query.answer_notes}` : ""
              }`
          )
          .join("\n");

  return [
    `# Clinical Study Report (borrador del centro)`,
    ``,
    `**Protocolo:** ${input.protocolCode} — ${input.protocolTitle}`,
    `**Fase de cierre:** ${input.closeout.phase}`,
    ``,
    `> Este documento lo arma Crisvia con los datos del site. **No es el CSR oficial del sponsor**, no está en formato ICH E3 certificado y **Crisvia no lo envía** a FDA, EMA, COFEPRIS ni ANMAT.`,
    ``,
    `## 1. Diseño`,
    ``,
    `Estudio conducido en el clinical research site. Screening (elegibilidad) → IWRS (kit/brazo) → EDC/ePRO (captura). El matching no sortea tratamiento.`,
    ``,
    `## 2. Limpieza y Database Lock`,
    ``,
    `- Lock: ${input.closeout.locked_at ?? "pendiente"}`,
    `- Declaración: ${input.closeout.lock_attestation || "—"}`,
    `- Tras el lock la base queda congelada: nadie puede alterar una celda.`,
    ``,
    `## 3. Apertura del ciego`,
    ``,
    `- Unblinding del estudio: ${input.closeout.unblinded_at ?? "pendiente"}`,
    `- Motivo: ${input.closeout.unblind_reason || "—"}`,
    `- El desenlace de emergencia IWRS (un sujeto, evento de seguridad) es otro procedimiento y puede ocurrir antes del lock.`,
    ``,
    `## 4. Resultados descriptivos`,
    ``,
    `${input.snapshot.disclaimer}`,
    ``,
    `- Randomizados: ${input.snapshot.n_randomized}`,
    `- Screen failures: ${input.snapshot.n_screen_failure}`,
    `- Visitas de seguimiento: ${input.snapshot.n_visits_done}/${input.snapshot.n_visits} completadas o fuera de ventana`,
    `- Eventos adversos (pacientes con ≥1 visita con EA): ${input.snapshot.overall_ae_n} (${input.snapshot.overall_ae_pct ?? "—"}% de randomizados)`,
    `- Adherencia media: ${input.snapshot.overall_mean_adherence ?? "—"}%`,
    `- Desviaciones de protocolo: ${input.snapshot.overall_deviations}`,
    ``,
    `### Por brazo`,
    ``,
    arms || "- Sin brazos visibles (¿se abrió el ciego?).",
    ``,
    `La pregunta de eficacia (“¿el medicamento mejoró de forma significativa vs placebo?”) la responde el bioestadístico del sponsor en SAS o R, no este snapshot.`,
    ``,
    `## 5. Desviaciones de protocolo`,
    ``,
    `Se registraron ${input.deviations} visita(s) fuera de ventana o perdidas en el calendario de seguimiento.`,
    ``,
    `## 6. Queries de monitoreo`,
    ``,
    queryLines,
    ``,
    `## 7. Sometimiento y Fase IV`,
    ``,
    `Si el sponsor considera que eficacia y seguridad sostienen una solicitud, empaqueta este informe con las fases anteriores y lo presenta a las agencias. Si aprueban, el medicamento entra a farmacovigilancia abierta (Fase IV). Crisvia solo deja constancia de que el centro cerró su base; no es la puerta de entrada regulatoria.`,
    ``,
  ].join("\n");
}

export function isMissingCloseoutSchema(message: string | undefined): boolean {
  if (!message) return false;
  const mentions =
    /protocol_closeouts|closeout_queries|closeout_lock|closeout_unblind|closeout_scan|database lock/i.test(
      message
    );
  const missing =
    /does not exist|schema cache|could not find|PGRST205|PGRST200/i.test(message);
  return mentions && missing;
}

export function isDatabaseLockError(message: string | undefined): boolean {
  if (!message) return false;
  return /database lock|base del protocolo está congelada/i.test(message);
}
