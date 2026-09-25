import type { Gender } from "@/lib/types";
import { withComputedBmi } from "@/lib/profile/clinical-measurements";
import {
  isEthnicity,
  type Ethnicity,
} from "@/lib/profile/demographics";
import { normalizeTerm } from "@/lib/utils";
import {
  firstFilled,
  parseCsvTable,
  parseImportDate,
  parseLabNumber,
  type CsvTable,
} from "@/lib/import/csvTable";

const NAME_FIRST = ["first_name", "firstname", "given_name", "nombre", "nombres"];
const NAME_LAST = ["last_name", "lastname", "surname", "apellido", "apellidos"];
const BIRTH = [
  "birth_date",
  "birthdate",
  "dob",
  "brthdtc",
  "fecha_nacimiento",
  "fechanacimiento",
  "fecha_de_nacimiento",
];
const SEX = ["gender", "sex", "sexo"];
const SUBJECT = [
  "subject_code",
  "usubjid",
  "subjid",
  "subjectid",
  "subject_id",
  "codigo",
];
const CONDITIONS = ["conditions", "diagnostico", "diagnosticos", "antecedentes"];
const MEDICATIONS = ["medications", "medicamentos", "comed"];

const DEMOGRAPHIC_COLUMNS = [
  "phone",
  "email",
  "ethnicity",
  "etnia",
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

function headerHas(headers: string[], keys: string[]): boolean {
  const set = new Set(headers);
  return keys.some((key) => set.has(key));
}

/** Parsea plantilla Crisvia (CSV, TSV pegado de Excel o ; de Excel LATAM). */
export function parsePatientTable(table: CsvTable): ParsedPatientRow[] {
  const { headers, rows: records } = table;
  if (!headerHas(headers, NAME_FIRST)) {
    throw new Error("Falta la columna obligatoria: first_name (o nombre).");
  }
  if (!headerHas(headers, NAME_LAST)) {
    throw new Error("Falta la columna obligatoria: last_name (o apellido).");
  }
  if (!headerHas(headers, BIRTH)) {
    throw new Error("Falta la columna obligatoria: birth_date (o fecha de nacimiento).");
  }
  if (!headerHas(headers, SEX)) {
    throw new Error("Falta la columna obligatoria: gender (o sexo).");
  }

  const reserved = new Set<string>([
    ...NAME_FIRST,
    ...NAME_LAST,
    ...BIRTH,
    ...SEX,
    ...SUBJECT,
    ...CONDITIONS,
    ...MEDICATIONS,
    ...DEMOGRAPHIC_COLUMNS,
  ]);
  const labColumns = headers.filter((h) => !reserved.has(h));

  return records.map((record) => {
    const laboratories: Record<string, number> = {};
    for (const lab of labColumns) {
      const num = parseLabNumber(record[lab] ?? "");
      if (num !== null) laboratories[lab] = num;
    }

    const rawBirth = firstFilled(record, BIRTH);
    const birthDate = parseImportDate(rawBirth) || rawBirth;
    const subjectCode = firstFilled(record, SUBJECT).replace(/[^\d]/g, "");

    return {
      first_name: firstFilled(record, NAME_FIRST),
      last_name: firstFilled(record, NAME_LAST),
      birth_date: birthDate,
      gender: parseGender(firstFilled(record, SEX)),
      phone: record.phone?.trim() || undefined,
      email: record.email?.trim() || undefined,
      ethnicity: parseEthnicity(firstFilled(record, ["ethnicity", "etnia"])),
      subject_code: subjectCode || undefined,
      address_line: record.address_line?.trim() || undefined,
      address_city: record.address_city?.trim() || undefined,
      conditions: parseList(firstFilled(record, CONDITIONS)),
      medications: parseList(firstFilled(record, MEDICATIONS)),
      laboratories: withComputedBmi(laboratories),
    };
  });
}

export function parsePatientCsv(text: string): ParsedPatientRow[] {
  return parsePatientTable(parseCsvTable(text));
}

export const PATIENT_CSV_TEMPLATE = `first_name,last_name,birth_date,gender,phone,email,ethnicity,subject_code,conditions,medications,pas,pad,frecuencia_cardiaca,temperatura,frecuencia_respiratoria,peso,estatura,glucosa,creatinina,tgo,tgp,hemoglobina,embarazo_sangre,embarazo_orina,hba1c
María,González,1962-04-12,female,+54 11 5555-0101,maria.g@example.com,mestizo,10001,diabetes tipo 2;hipertensión,metformina;enalapril,138,82,76,36.6,16,72,158,145,0.9,28,32,13.2,0,,7.8
Carlos,Fernández,1975-09-30,male,+54 11 5555-0102,carlos.f@example.com,blanco,10002,diabetes tipo 2,metformina,142,88,80,36.8,18,91,175,190,1.1,35,40,14.1,,,9.1`;
