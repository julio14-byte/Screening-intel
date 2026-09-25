import type { Gender } from "@/lib/types";
import { withComputedBmi } from "@/lib/profile/clinical-measurements";
import {
  parseEthnicity,
  parsePatientTable,
  type ParsedPatientRow,
} from "@/lib/import/parsePatientCsv";
import {
  firstFilled,
  parseCsvTable,
  parseImportDate,
  parseLabNumber,
} from "@/lib/import/csvTable";

/** Pedile al CRO/EDC DM + MH + CM + LB de screening. No es un API Clinical Ink ni IQVIA. */
export const VENDOR_SCREENING_HINT =
  "Pedí al CRO o al data manager el listado de screening (DM + MH + CM + LB). Pegalo desde Excel (más rápido que Guardar como CSV) o subí el archivo. No el diario ePRO ni el IRT. No hay enchufe certificado a Clinical Ink ni a IQVIA.";

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
  "screenid",
  "screening_no",
];
const CONDITIONS = [
  "conditions",
  "mhterm",
  "mhdecod",
  "diagnosis",
  "diagnostico",
  "diagnosticos",
  "medical_history",
  "antecedentes",
];
const MEDICATIONS = [
  "medications",
  "cmtrt",
  "cmdecod",
  "concomitant",
  "medicamentos",
  "comed",
];
const SKIP_AS_LAB = new Set([
  ...NAME_FIRST,
  ...NAME_LAST,
  ...BIRTH,
  ...SEX,
  ...SUBJECT,
  ...CONDITIONS,
  ...MEDICATIONS,
  "phone",
  "email",
  "ethnicity",
  "etnia",
  "race",
  "address_line",
  "address_city",
  "address_state",
  "address_postal_code",
  "address_country",
  "lbtest",
  "lbtestcd",
  "lbstresn",
  "lborres",
  "visit",
  "visitnum",
  "domain",
  "studyid",
  "siteid",
  "event",
  "kind",
  "kit_code",
  "qsscore",
  "pro_score",
  "epro",
  "diary",
  "arm",
  "rand",
]);

const LAB_ALIAS: Record<string, string> = {
  gluc: "glucosa",
  glucose: "glucosa",
  glucosa: "glucosa",
  hba1c: "hba1c",
  a1c: "hba1c",
  hba1: "hba1c",
  creat: "creatinina",
  creatinine: "creatinina",
  creatinina: "creatinina",
  sysbp: "pas",
  sbp: "pas",
  pas: "pas",
  diabp: "pad",
  dbp: "pad",
  pad: "pad",
  hr: "frecuencia_cardiaca",
  pulse: "frecuencia_cardiaca",
  frecuencia_cardiaca: "frecuencia_cardiaca",
  temp: "temperatura",
  temperatura: "temperatura",
  rr: "frecuencia_respiratoria",
  frecuencia_respiratoria: "frecuencia_respiratoria",
  wt: "peso",
  weight: "peso",
  peso: "peso",
  ht: "estatura",
  height: "estatura",
  estatura: "estatura",
  alt: "tgp",
  sgpt: "tgp",
  tgp: "tgp",
  ast: "tgo",
  sgot: "tgo",
  tgo: "tgo",
  hgb: "hemoglobina",
  hb: "hemoglobina",
  hemoglobin: "hemoglobina",
  hemoglobina: "hemoglobina",
};

export function isVendorScreeningHeader(headers: string[]): boolean {
  const set = new Set(headers);
  const crisvia =
    set.has("first_name") &&
    set.has("last_name") &&
    set.has("birth_date") &&
    set.has("gender");
  if (crisvia) return false;
  return (
    set.has("usubjid") ||
    set.has("subjid") ||
    set.has("mhterm") ||
    set.has("cmtrt") ||
    set.has("lbtestcd") ||
    set.has("lbtest")
  );
}

export function digitsSubjectCode(raw: string): string | undefined {
  const runs = raw.match(/\d{4,12}/g);
  if (!runs?.length) return undefined;
  return runs[runs.length - 1];
}

export function parseVendorDate(raw: string): string {
  return parseImportDate(raw);
}

export function parseVendorGender(value: string): Gender {
  const v = value.trim().toLowerCase();
  if (
    v === "m" ||
    v === "male" ||
    v === "masculino" ||
    v === "h" ||
    v === "1" ||
    v === "males"
  ) {
    return "male";
  }
  if (
    v === "f" ||
    v === "female" ||
    v === "femenino" ||
    v === "mujer" ||
    v === "2" ||
    v === "females"
  ) {
    return "female";
  }
  return "other";
}

function mapLabKey(raw: string): string | null {
  const key = raw.trim().toLowerCase().replace(/[\s\-]+/g, "_");
  if (!key || SKIP_AS_LAB.has(key)) return null;
  return LAB_ALIAS[key] ?? (key.length <= 40 ? key : null);
}

function pushUnique(list: string[], value: string) {
  const item = value.trim();
  if (!item) return;
  const seen = list.map((row) => row.toLowerCase());
  if (!seen.includes(item.toLowerCase())) list.push(item);
}

function subjectKey(record: Record<string, string>): string {
  return firstFilled(record, SUBJECT) || firstFilled(record, [...NAME_FIRST, ...NAME_LAST]);
}

export function collapseVendorRows(
  rows: Record<string, string>[]
): ParsedPatientRow[] {
  const groups = new Map<string, Record<string, string>[]>();
  for (const record of rows) {
    const key = subjectKey(record);
    if (!key) continue;
    const list = groups.get(key) ?? [];
    list.push(record);
    groups.set(key, list);
  }

  const patients: ParsedPatientRow[] = [];
  for (const [, group] of groups) {
    const conditions: string[] = [];
    const medications: string[] = [];
    const laboratories: Record<string, number> = {};
    let firstName = "";
    let lastName = "";
    let birth = "";
    let gender: Gender = "other";
    let ethnicity = "" as ReturnType<typeof parseEthnicity>;
    let subjectRaw = "";

    for (const record of group) {
      firstName ||= firstFilled(record, NAME_FIRST);
      lastName ||= firstFilled(record, NAME_LAST);
      birth ||= parseImportDate(firstFilled(record, BIRTH));
      const sex = firstFilled(record, SEX);
      if (sex) gender = parseVendorGender(sex);
      ethnicity ||= parseEthnicity(firstFilled(record, ["ethnicity", "etnia", "race"]));
      subjectRaw ||= firstFilled(record, SUBJECT);
      for (const col of CONDITIONS) {
        if (record[col]) pushUnique(conditions, record[col]);
      }
      for (const col of MEDICATIONS) {
        if (record[col]) pushUnique(medications, record[col]);
      }
      const labName = firstFilled(record, ["lbtestcd", "lbtest"]);
      const labValue = firstFilled(record, ["lbstresn", "lborres"]);
      if (labName && labValue) {
        if (/^(qs|pro|epro|diary)/i.test(labName)) continue;
        const mapped = mapLabKey(labName);
        const num = parseLabNumber(labValue);
        if (mapped && num !== null) laboratories[mapped] = num;
      }
      for (const [col, value] of Object.entries(record)) {
        if (SKIP_AS_LAB.has(col) || CONDITIONS.includes(col) || MEDICATIONS.includes(col)) {
          continue;
        }
        const mapped = mapLabKey(col);
        const num = parseLabNumber(value);
        if (mapped && num !== null) {
          laboratories[mapped] = num;
        }
      }
    }

    const subjectCode = digitsSubjectCode(subjectRaw);
    if (!birth) continue;

    patients.push({
      first_name: firstName || "Sujeto",
      last_name: lastName || subjectCode || "sin_nombre",
      birth_date: birth,
      gender,
      ethnicity,
      subject_code: subjectCode,
      conditions,
      medications,
      laboratories: withComputedBmi(laboratories),
    });
  }

  if (!patients.length) {
    throw new Error(
      "No se reconoció ningún sujeto. Pedí DM+MH+CM+LB (USUBJID, BRTHDTC, SEX, MHTERM, CMTRT, LBTESTCD, LBSTRESN)."
    );
  }
  return patients;
}

export function parseVendorScreeningCsv(text: string): ParsedPatientRow[] {
  const table = parseCsvTable(text);
  if (!isVendorScreeningHeader(table.headers) && !table.headers.includes("usubjid")) {
    throw new Error(
      "Este listado no parece una exportación de EDC. Pegá DM+MH+CM+LB desde Excel o usá la plantilla Crisvia."
    );
  }
  return collapseVendorRows(table.rows);
}

export function parseScreeningImportCsv(text: string): ParsedPatientRow[] {
  const table = parseCsvTable(text);
  if (isVendorScreeningHeader(table.headers)) {
    return collapseVendorRows(table.rows);
  }
  return parsePatientTable(table);
}

export const VENDOR_SCREENING_CSV_TEMPLATE = `USUBJID,BRTHDTC,SEX,MHTERM,CMTRT,LBTESTCD,LBSTRESN
10001,1962-04-12,F,diabetes tipo 2,metformina,GLUC,145
10001,1962-04-12,F,hipertensión,enalapril,HBA1C,7.8
10002,1975-09-30,M,diabetes tipo 2,metformina,GLUC,190`;
