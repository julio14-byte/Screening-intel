import type { Gender, Patient } from "@/lib/types";

export const ETHNICITY_VALUES = [
  "mestizo",
  "blanco",
  "indigena",
  "afrodescendiente",
  "asiatico",
  "otro",
  "no_informa",
] as const;

export type Ethnicity = (typeof ETHNICITY_VALUES)[number];

export const ETHNICITY_LABEL: Record<Ethnicity, string> = {
  mestizo: "Mestizo/a",
  blanco: "Blanco/a",
  indigena: "Indígena",
  afrodescendiente: "Afrodescendiente",
  asiatico: "Asiático/a",
  otro: "Otro",
  no_informa: "Prefiere no informar",
};

export type PatientDemographics = {
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: Gender;
  ethnicity: string;
  phone: string;
  email: string;
  address_line: string;
  address_city: string;
  address_state: string;
  address_postal_code: string;
  address_country: string;
  subject_code: string;
};

export function isEthnicity(value: string): value is Ethnicity {
  return (ETHNICITY_VALUES as readonly string[]).includes(value);
}

export function ethnicityLabel(value: string | null | undefined): string {
  if (!value) return "Sin registrar";
  return isEthnicity(value) ? ETHNICITY_LABEL[value] : value;
}

export function demographicsFromPatient(patient: Patient): PatientDemographics {
  return {
    first_name: patient.first_name ?? "",
    last_name: patient.last_name ?? "",
    birth_date: patient.birth_date ?? "",
    gender: patient.gender,
    ethnicity: patient.ethnicity ?? "",
    phone: patient.phone ?? "",
    email: patient.email ?? "",
    address_line: patient.address_line ?? "",
    address_city: patient.address_city ?? "",
    address_state: patient.address_state ?? "",
    address_postal_code: patient.address_postal_code ?? "",
    address_country: patient.address_country ?? "MX",
    subject_code: patient.subject_code ?? "",
  };
}

export function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function demographicsToRow(value: PatientDemographics) {
  const subjectCode = blankToNull(value.subject_code);
  if (subjectCode && !/^[0-9]{4,12}$/.test(subjectCode)) {
    throw new Error("El código de sujeto debe ser un número de 4 a 12 dígitos.");
  }
  if (!value.first_name.trim() || !value.last_name.trim()) {
    throw new Error("Nombre y apellido son obligatorios.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.birth_date)) {
    throw new Error("La fecha de nacimiento es obligatoria.");
  }
  return {
    first_name: value.first_name.trim(),
    last_name: value.last_name.trim(),
    birth_date: value.birth_date,
    gender: value.gender,
    ethnicity: blankToNull(value.ethnicity),
    phone: blankToNull(value.phone),
    email: blankToNull(value.email),
    address_line: blankToNull(value.address_line),
    address_city: blankToNull(value.address_city),
    address_state: blankToNull(value.address_state),
    address_postal_code: blankToNull(value.address_postal_code),
    address_country: value.address_country.trim() || "MX",
    ...(subjectCode ? { subject_code: subjectCode } : {}),
  };
}

export function formatSubjectCode(code: string | null | undefined): string | null {
  const trimmed = code?.trim();
  return trimmed ? trimmed : null;
}

export function studySubjectCaption(
  patient: Pick<Patient, "subject_code"> | { subject_code?: string | null }
): string | null {
  const code = formatSubjectCode(patient.subject_code);
  return code ? `Sujeto ${code}` : null;
}

export function isMissingDemographicsColumn(message: string | undefined): boolean {
  if (!message) return false;
  if (/duplicate|unique constraint/i.test(message)) return false;
  const mentionsColumn =
    /subject_code|ethnicity|address_line|address_city|address_state|address_postal_code|address_country/i.test(
      message
    );
  const missing =
    /does not exist|schema cache|could not find the '/i.test(message);
  return mentionsColumn && missing;
}
