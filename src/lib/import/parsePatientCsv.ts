import type { Gender } from "@/lib/types";

export type ParsedPatientRow = {
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: Gender;
  conditions: string[];
  medications: string[];
  laboratories: Record<string, number>;
};

function parseList(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(/[;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseGender(value: string): Gender {
  const v = value.trim().toLowerCase();
  if (v === "m" || v === "male" || v === "masculino" || v === "h") return "male";
  if (v === "f" || v === "female" || v === "femenino" || v === "mujer") return "female";
  return "other";
}

/** Parsea CSV de pacientes (cabecera obligatoria). */
export function parsePatientCsv(text: string): ParsedPatientRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("El CSV debe tener cabecera y al menos una fila de datos.");
  }

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const required = ["first_name", "last_name", "birth_date", "gender"];
  for (const col of required) {
    if (!header.includes(col)) {
      throw new Error(`Falta la columna obligatoria: ${col}`);
    }
  }

  const labColumns = header.filter(
    (h) => !required.includes(h) && h !== "conditions" && h !== "medications"
  );

  const rows: ParsedPatientRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const record: Record<string, string> = {};
    header.forEach((key, idx) => {
      record[key] = cells[idx] ?? "";
    });

    const laboratories: Record<string, number> = {};
    for (const lab of labColumns) {
      const num = Number(record[lab]);
      if (!Number.isNaN(num) && record[lab] !== "") {
        laboratories[lab] = num;
      }
    }

    rows.push({
      first_name: record.first_name,
      last_name: record.last_name,
      birth_date: record.birth_date,
      gender: parseGender(record.gender),
      conditions: parseList(record.conditions),
      medications: parseList(record.medications),
      laboratories,
    });
  }

  return rows;
}

export const PATIENT_CSV_TEMPLATE = `first_name,last_name,birth_date,gender,conditions,medications,glucosa,hba1c
María,González,1962-04-12,female,diabetes tipo 2;hipertensión,metformina;enalapril,145,7.8
Carlos,Fernández,1975-09-30,male,diabetes tipo 2,metformina,190,9.1`;
