import { redactIdentifiers } from "@/lib/privacy/redact";
import { SCREENING_STATUS_LABELS } from "@/lib/utils";
import type { ScreeningStatus, ScreeningWithRelations } from "@/lib/types";
import { siteDisplayName, siteLocation, type SiteProfile } from "@/lib/site/profile";

export const NO_SUBJECT_CODE = "Sin código";

export interface ScreeningLogEntry {
  seq: number;
  screeningId: string;
  subjectCode: string;
  hasSubjectCode: boolean;
  protocolId: string;
  protocolCode: string;
  protocolTitle: string;
  status: ScreeningStatus;
  statusLabel: string;
  screenedOn: string;
  outcomeOn: string;
  failureReason: string;
}

export interface ScreeningLogSummary {
  screened: number;
  inProgress: number;
  randomized: number;
  screenFailures: number;
  screenFailureRate: number;
  withoutSubjectCode: number;
}

export interface ScreeningLogOptions {
  protocolId?: string;
  includePreScreening?: boolean;
}

const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "");

/**
 * El motivo es texto libre: se enmascaran nombres propios y datos de contacto
 * para que la bitácora solo identifique al sujeto por su código.
 */
function safeReason(row: ScreeningWithRelations): string {
  const reason = row.failure_reason?.trim() ?? "";
  if (!reason) return "";
  return redactIdentifiers(reason, {
    names: [row.patients.first_name, row.patients.last_name],
  }).text;
}

export function buildScreeningLog(
  rows: ScreeningWithRelations[],
  options: ScreeningLogOptions = {}
): ScreeningLogEntry[] {
  const includePre = options.includePreScreening ?? false;
  const filtered = rows
    .filter((r) => !options.protocolId || r.protocol_id === options.protocolId)
    .filter((r) => includePre || r.status !== "pre_screening")
    .slice()
    .sort(
      (a, b) =>
        a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)
    );

  return filtered.map((row, index) => {
    const code = row.patients.subject_code?.trim() ?? "";
    const closed = row.status === "randomized" || row.status === "screen_failure";
    const outcomeOn = closed
      ? day(row.status === "screen_failure" ? row.failure_recorded_at : null) ||
        day(row.updated_at)
      : "";
    return {
      seq: index + 1,
      screeningId: row.id,
      subjectCode: code || NO_SUBJECT_CODE,
      hasSubjectCode: Boolean(code),
      protocolId: row.protocol_id,
      protocolCode: row.protocols.code_name,
      protocolTitle: row.protocols.title,
      status: row.status,
      statusLabel: SCREENING_STATUS_LABELS[row.status],
      screenedOn: day(row.created_at),
      outcomeOn,
      failureReason: row.status === "screen_failure" ? safeReason(row) : "",
    };
  });
}

export function summarizeScreeningLog(
  entries: ScreeningLogEntry[]
): ScreeningLogSummary {
  const count = (s: ScreeningStatus) =>
    entries.filter((e) => e.status === s).length;
  const randomized = count("randomized");
  const screenFailures = count("screen_failure");
  const closed = randomized + screenFailures;
  return {
    screened: entries.length,
    inProgress: entries.length - closed,
    randomized,
    screenFailures,
    screenFailureRate: closed === 0 ? 0 : Math.round((screenFailures / closed) * 100),
    withoutSubjectCode: entries.filter((e) => !e.hasSubjectCode).length,
  };
}

function csvEscape(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) value = `'${value}`;
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function screeningLogToCsv(
  entries: ScreeningLogEntry[],
  site?: SiteProfile | null,
  reportDate: Date = new Date()
): string {
  const lines: string[] = [];
  const siteName = siteDisplayName(site);
  if (site && siteName) {
    lines.push(["Bitácora de screening", siteName].map(csvEscape).join(","));
    if (site.pi_name) lines.push(["Investigador principal", site.pi_name].map(csvEscape).join(","));
    const where = siteLocation(site);
    if (where) lines.push(["Ubicación", where].map(csvEscape).join(","));
    lines.push(["Fecha del reporte", reportDate.toISOString().slice(0, 10)].join(","));
    lines.push("");
  }
  lines.push(
    [
      "no",
      "codigo_sujeto",
      "protocolo_codigo",
      "protocolo_titulo",
      "fecha_screening",
      "estado",
      "fecha_resultado",
      "motivo_screen_failure",
    ].join(",")
  );
  for (const e of entries) {
    lines.push(
      [
        String(e.seq),
        csvEscape(e.subjectCode),
        csvEscape(e.protocolCode),
        csvEscape(e.protocolTitle),
        e.screenedOn,
        csvEscape(e.statusLabel),
        e.outcomeOn,
        csvEscape(e.failureReason),
      ].join(",")
    );
  }
  return lines.join("\n");
}
