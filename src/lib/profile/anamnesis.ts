export const DIAGNOSIS_SEVERITIES = ["leve", "moderada", "grave"] as const;
export type DiagnosisSeverity = (typeof DIAGNOSIS_SEVERITIES)[number];

export const MEDICATION_KINDS = [
  "farmaco",
  "vitamina",
  "suplemento",
  "herbolario",
] as const;
export type MedicationKind = (typeof MEDICATION_KINDS)[number];

export const MEDICATION_STATUSES = ["current", "recent"] as const;
export type MedicationStatus = (typeof MEDICATION_STATUSES)[number];

export const ALLERGY_CATEGORIES = [
  "medicamento",
  "alimento",
  "quimico",
  "otra",
] as const;
export type AllergyCategory = (typeof ALLERGY_CATEGORIES)[number];

export interface AnamnesisDiagnosis {
  id: string;
  name: string;
  diagnosed_at: string;
  symptoms: string;
  severity: DiagnosisSeverity | "";
  evolution: string;
}

export interface AnamnesisMedication {
  id: string;
  name: string;
  kind: MedicationKind;
  dose: string;
  schedule: string;
  status: MedicationStatus;
}

export interface AnamnesisAllergy {
  id: string;
  substance: string;
  category: AllergyCategory;
  reaction: string;
}

export interface ClinicalAnamnesis {
  diagnoses: AnamnesisDiagnosis[];
  surgeries: string;
  hospitalizations: string;
  medications: AnamnesisMedication[];
  allergies: AnamnesisAllergy[];
}

export const DIAGNOSIS_SEVERITY_LABEL: Record<DiagnosisSeverity, string> = {
  leve: "Leve",
  moderada: "Moderada",
  grave: "Grave",
};

export const MEDICATION_KIND_LABEL: Record<MedicationKind, string> = {
  farmaco: "Fármaco",
  vitamina: "Vitamina",
  suplemento: "Suplemento",
  herbolario: "Herbolario",
};

export const MEDICATION_STATUS_LABEL: Record<MedicationStatus, string> = {
  current: "Actual",
  recent: "Últimos meses",
};

export const ALLERGY_CATEGORY_LABEL: Record<AllergyCategory, string> = {
  medicamento: "Medicamento",
  alimento: "Alimento",
  quimico: "Sustancia química",
  otra: "Otra",
};

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function emptyDiagnosis(name = ""): AnamnesisDiagnosis {
  return {
    id: newId(),
    name,
    diagnosed_at: "",
    symptoms: "",
    severity: "",
    evolution: "",
  };
}

export function emptyMedication(name = ""): AnamnesisMedication {
  return {
    id: newId(),
    name,
    kind: "farmaco",
    dose: "",
    schedule: "",
    status: "current",
  };
}

export function emptyAllergy(): AnamnesisAllergy {
  return {
    id: newId(),
    substance: "",
    category: "medicamento",
    reaction: "",
  };
}

export function emptyAnamnesis(): ClinicalAnamnesis {
  return {
    diagnoses: [],
    surgeries: "",
    hospitalizations: "",
    medications: [],
    allergies: [],
  };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asSeverity(value: unknown): DiagnosisSeverity | "" {
  return DIAGNOSIS_SEVERITIES.includes(value as DiagnosisSeverity)
    ? (value as DiagnosisSeverity)
    : "";
}

function asMedKind(value: unknown): MedicationKind {
  return MEDICATION_KINDS.includes(value as MedicationKind)
    ? (value as MedicationKind)
    : "farmaco";
}

function asMedStatus(value: unknown): MedicationStatus {
  return MEDICATION_STATUSES.includes(value as MedicationStatus)
    ? (value as MedicationStatus)
    : "current";
}

function asAllergyCategory(value: unknown): AllergyCategory {
  return ALLERGY_CATEGORIES.includes(value as AllergyCategory)
    ? (value as AllergyCategory)
    : "otra";
}

export function normalizeAnamnesis(raw: unknown): ClinicalAnamnesis {
  const base = emptyAnamnesis();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const value = raw as Record<string, unknown>;

  const diagnoses = Array.isArray(value.diagnoses) ? value.diagnoses : [];
  const medications = Array.isArray(value.medications) ? value.medications : [];
  const allergies = Array.isArray(value.allergies) ? value.allergies : [];

  return {
    diagnoses: diagnoses.map((item) => {
      const row = (item ?? {}) as Record<string, unknown>;
      return {
        id: asString(row.id) || newId(),
        name: asString(row.name).trim(),
        diagnosed_at: asString(row.diagnosed_at).slice(0, 10),
        symptoms: asString(row.symptoms),
        severity: asSeverity(row.severity),
        evolution: asString(row.evolution),
      };
    }),
    surgeries: asString(value.surgeries),
    hospitalizations: asString(value.hospitalizations),
    medications: medications.map((item) => {
      const row = (item ?? {}) as Record<string, unknown>;
      return {
        id: asString(row.id) || newId(),
        name: asString(row.name).trim(),
        kind: asMedKind(row.kind),
        dose: asString(row.dose),
        schedule: asString(row.schedule),
        status: asMedStatus(row.status),
      };
    }),
    allergies: allergies.map((item) => {
      const row = (item ?? {}) as Record<string, unknown>;
      return {
        id: asString(row.id) || newId(),
        substance: asString(row.substance).trim(),
        category: asAllergyCategory(row.category),
        reaction: asString(row.reaction),
      };
    }),
  };
}

/** Completa la anamnesis con condiciones/medicación planas de perfiles viejos. */
export function hydrateAnamnesis(input: {
  anamnesis?: unknown;
  conditions?: string[];
  medications?: string[];
}): ClinicalAnamnesis {
  const anamnesis = normalizeAnamnesis(input.anamnesis);
  const diagnosisNames = new Set(
    anamnesis.diagnoses.map((row) => row.name.trim().toLowerCase()).filter(Boolean)
  );
  for (const name of input.conditions ?? []) {
    const trimmed = name.trim();
    if (!trimmed || diagnosisNames.has(trimmed.toLowerCase())) continue;
    anamnesis.diagnoses.push(emptyDiagnosis(trimmed));
    diagnosisNames.add(trimmed.toLowerCase());
  }

  const medNames = new Set(
    anamnesis.medications.map((row) => row.name.trim().toLowerCase()).filter(Boolean)
  );
  for (const name of input.medications ?? []) {
    const trimmed = name.trim();
    if (!trimmed || medNames.has(trimmed.toLowerCase())) continue;
    anamnesis.medications.push(emptyMedication(trimmed));
    medNames.add(trimmed.toLowerCase());
  }

  return anamnesis;
}

export function matchingConditions(anamnesis: ClinicalAnamnesis): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const row of anamnesis.diagnoses) {
    const name = row.name.trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

export function matchingMedications(anamnesis: ClinicalAnamnesis): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const row of anamnesis.medications) {
    const name = row.name.trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

export function mergeAnamnesisDraft(
  current: ClinicalAnamnesis,
  draft: {
    conditions?: string[];
    medications?: string[];
    anamnesis?: unknown;
  }
): ClinicalAnamnesis {
  const incoming = hydrateAnamnesis({
    anamnesis: draft.anamnesis,
    conditions: draft.conditions,
    medications: draft.medications,
  });

  const diagnoses = [...current.diagnoses];
  for (const row of incoming.diagnoses) {
    const key = row.name.trim().toLowerCase();
    if (!key) continue;
    const index = diagnoses.findIndex((item) => item.name.trim().toLowerCase() === key);
    if (index === -1) {
      diagnoses.push(row);
      continue;
    }
    diagnoses[index] = {
      ...diagnoses[index],
      diagnosed_at: diagnoses[index].diagnosed_at || row.diagnosed_at,
      symptoms: diagnoses[index].symptoms || row.symptoms,
      severity: diagnoses[index].severity || row.severity,
      evolution: diagnoses[index].evolution || row.evolution,
    };
  }

  const medications = [...current.medications];
  for (const row of incoming.medications) {
    const key = row.name.trim().toLowerCase();
    if (!key) continue;
    const index = medications.findIndex((item) => item.name.trim().toLowerCase() === key);
    if (index === -1) {
      medications.push(row);
      continue;
    }
    medications[index] = {
      ...medications[index],
      dose: medications[index].dose || row.dose,
      schedule: medications[index].schedule || row.schedule,
      kind: medications[index].kind || row.kind,
      status: medications[index].status || row.status,
    };
  }

  const allergies = [...current.allergies];
  for (const row of incoming.allergies) {
    const key = row.substance.trim().toLowerCase();
    if (!key) continue;
    if (
      allergies.some((item) => item.substance.trim().toLowerCase() === key)
    ) {
      continue;
    }
    allergies.push(row);
  }

  return {
    diagnoses,
    medications,
    allergies,
    surgeries: [current.surgeries, incoming.surgeries]
      .map((part) => part.trim())
      .filter(Boolean)
      .filter((part, i, all) => all.indexOf(part) === i)
      .join("\n"),
    hospitalizations: [current.hospitalizations, incoming.hospitalizations]
      .map((part) => part.trim())
      .filter(Boolean)
      .filter((part, i, all) => all.indexOf(part) === i)
      .join("\n"),
  };
}
