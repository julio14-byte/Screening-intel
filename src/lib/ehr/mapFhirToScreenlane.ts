import type { Gender } from "@/lib/types";
import { normalizeTerm } from "@/lib/utils";
import type { EhrPatientPayload } from "./types";

type FhirName = {
  given?: string[];
  family?: string;
};

type FhirPatient = {
  resourceType?: "Patient";
  id?: string;
  name?: FhirName[];
  birthDate?: string;
  gender?: string;
};

type FhirCondition = {
  resourceType?: "Condition";
  code?: { text?: string; coding?: { display?: string }[] };
};

type FhirMedicationStatement = {
  resourceType?: "MedicationStatement";
  medicationCodeableConcept?: { text?: string; coding?: { display?: string }[] };
};

type FhirObservation = {
  resourceType?: "Observation";
  category?: { coding?: { code?: string }[] }[];
  code?: { text?: string; coding?: { display?: string }[] };
  valueQuantity?: { value?: number };
};

type FhirEntry = {
  resource?: FhirPatient | FhirCondition | FhirMedicationStatement | FhirObservation;
};

type FhirBundle = {
  resourceType?: "Bundle";
  entry?: FhirEntry[];
};

function mapFhirGender(value: string | undefined): Gender {
  switch (value?.toLowerCase()) {
    case "male":
      return "male";
    case "female":
      return "female";
    default:
      return "other";
  }
}

function codingDisplay(
  concept?: { text?: string; coding?: { display?: string }[] }
): string | null {
  if (!concept) return null;
  if (concept.text?.trim()) return concept.text.trim();
  const display = concept.coding?.find((c) => c.display?.trim())?.display;
  return display?.trim() ?? null;
}

function isLabObservation(obs: FhirObservation): boolean {
  const categories = obs.category ?? [];
  return categories.some((cat) =>
    (cat.coding ?? []).some(
      (c) => c.code === "laboratory" || c.code === "LAB"
    )
  );
}

/**
 * Convierte un Bundle FHIR (Patient + Conditions + Meds + Observations)
 * al formato interno de Screenlane.
 */
export function mapFhirBundleToPatient(
  bundle: FhirBundle,
  fallbackEhrId?: string
): EhrPatientPayload | null {
  const resources = (bundle.entry ?? [])
    .map((e) => e.resource)
    .filter(Boolean);

  const patientResource = resources.find(
    (r) => r?.resourceType === "Patient"
  ) as FhirPatient | undefined;

  if (!patientResource) return null;

  const ehrPatientId = patientResource.id ?? fallbackEhrId;
  const name = patientResource.name?.[0];
  const firstName = name?.given?.[0]?.trim();
  const lastName = name?.family?.trim();

  if (!ehrPatientId || !firstName || !lastName || !patientResource.birthDate) {
    return null;
  }

  const conditions: string[] = [];
  const medications: string[] = [];
  const laboratories: Record<string, number> = {};

  for (const resource of resources) {
    if (resource?.resourceType === "Condition") {
      const label = codingDisplay((resource as FhirCondition).code);
      if (label) conditions.push(label);
    }
    if (resource?.resourceType === "MedicationStatement") {
      const label = codingDisplay(
        (resource as FhirMedicationStatement).medicationCodeableConcept
      );
      if (label) medications.push(label);
    }
    if (resource?.resourceType === "Observation") {
      const obs = resource as FhirObservation;
      if (!isLabObservation(obs)) continue;
      const labName = codingDisplay(obs.code);
      const value = obs.valueQuantity?.value;
      if (labName && typeof value === "number" && Number.isFinite(value)) {
        laboratories[normalizeTerm(labName)] = value;
      }
    }
  }

  return {
    ehr_patient_id: ehrPatientId,
    first_name: firstName,
    last_name: lastName,
    birth_date: patientResource.birthDate,
    gender: mapFhirGender(patientResource.gender),
    conditions: [...new Set(conditions)],
    medications: [...new Set(medications)],
    laboratories,
  };
}

/** Detecta si el body es un Bundle FHIR y lo normaliza. */
export function normalizeEhrPatientInput(
  input: unknown
): EhrPatientPayload | null {
  if (!input || typeof input !== "object") return null;

  const obj = input as Record<string, unknown>;

  if (obj.resourceType === "Bundle") {
    return mapFhirBundleToPatient(obj as FhirBundle);
  }

  if (
    typeof obj.ehr_patient_id === "string" &&
    typeof obj.first_name === "string" &&
    typeof obj.last_name === "string" &&
    typeof obj.birth_date === "string" &&
    typeof obj.gender === "string"
  ) {
    return {
      ehr_patient_id: obj.ehr_patient_id,
      first_name: obj.first_name,
      last_name: obj.last_name,
      birth_date: obj.birth_date,
      gender: obj.gender as Gender,
      conditions: Array.isArray(obj.conditions)
        ? (obj.conditions as string[])
        : [],
      medications: Array.isArray(obj.medications)
        ? (obj.medications as string[])
        : [],
      laboratories:
        obj.laboratories && typeof obj.laboratories === "object"
          ? (obj.laboratories as Record<string, number>)
          : {},
    };
  }

  return null;
}
