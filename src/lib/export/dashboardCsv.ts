import type { ScreeningWithRelations } from "@/lib/types";
import { screeningToVerdict } from "@/lib/dashboard/traffic-light";
import { SCREENING_STATUS_LABELS } from "@/lib/utils";

const VERDICT_LABELS = {
  eligible: "Cumple",
  pending: "Pendiente",
  excluded: "No cumple",
} as const;

export function screeningsToCsv(rows: ScreeningWithRelations[]): string {
  const header = [
    "paciente",
    "protocolo_codigo",
    "protocolo_titulo",
    "estado_screening",
    "semaforo",
    "match_score",
    "actualizado",
  ];

  const lines = rows.map((row) => {
    const verdict = screeningToVerdict(row);
    const patient = `${row.patients.last_name}, ${row.patients.first_name}`;
    return [
      csvEscape(patient),
      csvEscape(row.protocols.code_name),
      csvEscape(row.protocols.title),
      csvEscape(SCREENING_STATUS_LABELS[row.status]),
      csvEscape(VERDICT_LABELS[verdict]),
      String(row.match_score),
      csvEscape(row.updated_at.slice(0, 10)),
    ].join(",");
  });

  return [header.join(","), ...lines].join("\n");
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob(["\uFEFF" + content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
