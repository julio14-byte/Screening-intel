import type { Gender } from "@/lib/types";
import { withComputedBmi } from "@/lib/profile/clinical-measurements";
import {
  isEthnicity,
  type Ethnicity,
} from "@/lib/profile/demographics";
import { normalizeTerm } from "@/lib/utils";

const DEMOGRAPHIC_COLUMNS = [
  "phone",
  "email",
  "ethnicity",
  "subject_code",
  "address_line",
  "address_city",
  "address_state",
  "address_postal_code",
  "address_country",
] as const;

export type ParsedPatientRow = {
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: Gender;
  phone?: string;
  email?: string;
  ethnicity?: Ethnicity | "";
  subject_code?: string;
  address_line?: string;
  address_city?: string;
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

export function parseEthnicity(value: string | undefined): Ethnicity | "" {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  if (isEthnicity(raw)) return raw;
  const v = normalizeTerm(raw);
  if (v === "mestizo" || v === "mestiza") return "mestizo";
  if (v === "blanco" || v === "blanca" || v === "caucasico" || v === "caucasica") {
    return "blanco";
  }
  if (v === "indigena" || v === "amerindio" || v === "nativo") return "indigena";
  if (v === "afrodescendiente" || v === "negro" || v === "negra" || v === "afro") {
    return "afrodescendiente";
  }
  if (v === "asiatico" || v === "asiatica") return "asiatico";
  if (v === "otro" || v === "otra") return "otro";
  if (v.includes("no informa") || v.includes("no declara")) return "no_informa";
  return "";
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

  const reserved = new Set<string>([
    ...required,
    "conditions",
    "medications",
    ...DEMOGRAPHIC_COLUMNS,
  ]);
  const labColumns = header.filter((h) => !reserved.has(h));

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

    const subjectCode = (record.subject_code ?? "").replace(/[^\d]/g, "");

    rows.push({
      first_name: record.first_name,
      last_name: record.last_name,
      birth_date: record.birth_date,
      gender: parseGender(record.gender),
      phone: record.phone?.trim() || undefined,
      email: record.email?.trim() || undefined,
      ethnicity: parseEthnicity(record.ethnicity),
      subject_code: subjectCode || undefined,
      address_line: record.address_line?.trim() || undefined,
      address_city: record.address_city?.trim() || undefined,
      conditions: parseList(record.conditions),
      medications: parseList(record.medications),
      laboratories: withComputedBmi(laboratories),
    });
  }

  return rows;
}

export const PATIENT_CSV_TEMPLATE = `first_name,last_name,birth_date,gender,phone,email,ethnicity,subject_code,conditions,medications,pas,pad,frecuencia_cardiaca,temperatura,frecuencia_respiratoria,peso,estatura,glucosa,creatinina,tgo,tgp,hemoglobina,embarazo_sangre,embarazo_orina,hba1c
María,González,1962-04-12,female,+54 11 5555-0101,maria.g@example.com,mestizo,10001,diabetes tipo 2;hipertensión,metformina;enalapril,138,82,76,36.6,16,72,158,145,0.9,28,32,13.2,0,,7.8
Carlos,Fernández,1975-09-30,male,+54 11 5555-0102,carlos.f@example.com,blanco,10002,diabetes tipo 2,metformina,142,88,80,36.8,18,91,175,190,1.1,35,40,14.1,,,9.1`;
