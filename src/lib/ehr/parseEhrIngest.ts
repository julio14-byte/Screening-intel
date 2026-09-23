import type { Gender } from "@/lib/types";
import { normalizeEhrPatientInput } from "./mapFhirToScreenlane";
import type { EhrPatientPayload } from "./types";

export const EHR_CSV_TEMPLATE = `ehr_patient_id,first_name,last_name,birth_date,gender,conditions,medications,glucosa,hba1c
EHR-1001,María,González,1962-04-12,female,diabetes tipo 2;hipertensión,metformina;enalapril,145,7.8
EHR-1002,Carlos,Fernández,1975-09-30,male,diabetes tipo 2,metformina,190,9.1`;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseList(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(/[;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseGender(value: string): Gender {
  const normalized = value.trim().toLowerCase();
  if (normalized === "m" || normalized === "male" || normalized === "masculino" || normalized === "h") {
    return "male";
  }
  if (
    normalized === "f" ||
    normalized === "female" ||
    normalized === "femenino" ||
    normalized === "mujer"
  ) {
    return "female";
  }
  return "other";
}

export function parseLabPairs(value: string): Record<string, number> {
  const laboratories: Record<string, number> = {};
  if (!value.trim()) return laboratories;

  for (const part of value.split(/[,;]/)) {
    const [key, raw] = part.split(":").map((item) => item.trim());
    if (!key || raw == null || raw === "") continue;
    const num = Number(raw);
    if (!Number.isNaN(num)) laboratories[key] = num;
  }

  return laboratories;
}

function requirePatient(payload: EhrPatientPayload | null, label: string): EhrPatientPayload {
  if (!payload?.ehr_patient_id?.trim()) {
    throw new Error(`${label}: falta ehr_patient_id.`);
  }
  if (!payload.first_name?.trim() || !payload.last_name?.trim()) {
    throw new Error(`${label}: nombre y apellido son obligatorios.`);
  }
  if (!DATE_RE.test(payload.birth_date ?? "")) {
    throw new Error(`${label}: birth_date debe ser YYYY-MM-DD.`);
  }
  return payload;
}

export function parseEhrCsv(text: string): EhrPatientPayload[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("El CSV debe tener cabecera y al menos una fila.");
  }

  const header = lines[0].split(",").map((item) => item.trim().toLowerCase());
  const required = ["ehr_patient_id", "first_name", "last_name", "birth_date", "gender"];
  for (const column of required) {
    if (!header.includes(column)) {
      throw new Error(`Falta la columna obligatoria: ${column}`);
    }
  }

  const reserved = new Set([...required, "conditions", "medications"]);
  const labColumns = header.filter((column) => !reserved.has(column));
  const rows: EhrPatientPayload[] = [];

  for (let index = 1; index < lines.length; index += 1) {
    const cells = lines[index].split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""));
    const record: Record<string, string> = {};
    header.forEach((key, cellIndex) => {
      record[key] = cells[cellIndex] ?? "";
    });

    const laboratories: Record<string, number> = {};
    for (const lab of labColumns) {
      const raw = record[lab];
      const num = Number(raw);
      if (raw !== "" && !Number.isNaN(num)) laboratories[lab] = num;
    }

    rows.push(
      requirePatient(
        {
          ehr_patient_id: record.ehr_patient_id,
          first_name: record.first_name,
          last_name: record.last_name,
          birth_date: record.birth_date,
          gender: parseGender(record.gender),
          conditions: parseList(record.conditions),
          medications: parseList(record.medications),
          laboratories,
        },
        `Fila ${index + 1}`
      )
    );
  }

  return rows;
}

export function parseEhrIngestText(text: string): {
  patients: EhrPatientPayload[];
  ehr_source?: string;
} {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Pegá JSON o CSV con al menos un paciente.");
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new Error("JSON inválido.");
    }

    if (Array.isArray(parsed)) {
      return {
        patients: parsed.map((item, index) =>
          requirePatient(normalizeEhrPatientInput(item), `Paciente ${index + 1}`)
        ),
      };
    }

    if (!parsed || typeof parsed !== "object") {
      throw new Error("JSON EHR inválido.");
    }

    const record = parsed as Record<string, unknown>;
    if (record.resourceType === "Bundle") {
      return {
        patients: [requirePatient(normalizeEhrPatientInput(record), "Bundle FHIR")],
      };
    }

    if (Array.isArray(record.patients)) {
      return {
        ehr_source:
          typeof record.ehr_source === "string" && record.ehr_source.trim()
            ? record.ehr_source.trim()
            : undefined,
        patients: record.patients.map((item, index) =>
          requirePatient(normalizeEhrPatientInput(item), `Paciente ${index + 1}`)
        ),
      };
    }

    return {
      patients: [requirePatient(normalizeEhrPatientInput(record), "Paciente")],
    };
  }

  return { patients: parseEhrCsv(trimmed) };
}
