/** Campos biométricos y clínicos del perfil. Viven en clinical_profiles.laboratories (JSONB) para el matching. */

export type MeasurementGroup =
  | "vitals"
  | "anthropometry"
  | "labs"
  | "pregnancy";

export interface MeasurementField {
  key: string;
  label: string;
  unit: string;
  group: MeasurementGroup;
  step?: string;
  min?: number;
  max?: number;
  kind?: "number" | "pregnancy";
  computed?: boolean;
  hint?: string;
}

export const MEASUREMENT_FIELDS: MeasurementField[] = [
  {
    key: "pas",
    label: "Presión arterial sistólica",
    unit: "mmHg",
    group: "vitals",
    min: 60,
    max: 260,
  },
  {
    key: "pad",
    label: "Presión arterial diastólica",
    unit: "mmHg",
    group: "vitals",
    min: 30,
    max: 160,
  },
  {
    key: "frecuencia_cardiaca",
    label: "Frecuencia cardíaca",
    unit: "lpm",
    group: "vitals",
    min: 20,
    max: 250,
  },
  {
    key: "temperatura",
    label: "Temperatura",
    unit: "°C",
    group: "vitals",
    step: "0.1",
    min: 32,
    max: 43,
  },
  {
    key: "frecuencia_respiratoria",
    label: "Frecuencia respiratoria",
    unit: "rpm",
    group: "vitals",
    min: 4,
    max: 60,
  },
  {
    key: "peso",
    label: "Peso",
    unit: "kg",
    group: "anthropometry",
    step: "0.1",
    min: 1,
    max: 400,
  },
  {
    key: "estatura",
    label: "Estatura",
    unit: "cm",
    group: "anthropometry",
    step: "0.1",
    min: 30,
    max: 250,
  },
  {
    key: "imc",
    label: "Índice de masa corporal",
    unit: "kg/m²",
    group: "anthropometry",
    computed: true,
    hint: "Se calcula con peso y estatura",
  },
  {
    key: "glucosa",
    label: "Glucosa",
    unit: "mg/dL",
    group: "labs",
  },
  {
    key: "creatinina",
    label: "Creatinina (función renal)",
    unit: "mg/dL",
    group: "labs",
    step: "0.01",
  },
  {
    key: "tgo",
    label: "TGO / AST (hígado)",
    unit: "U/L",
    group: "labs",
  },
  {
    key: "tgp",
    label: "TGP / ALT (hígado)",
    unit: "U/L",
    group: "labs",
  },
  {
    key: "ggt",
    label: "GGT (hígado)",
    unit: "U/L",
    group: "labs",
  },
  {
    key: "fa",
    label: "Fosfatasa alcalina",
    unit: "U/L",
    group: "labs",
  },
  {
    key: "hemoglobina",
    label: "Hemoglobina",
    unit: "g/dL",
    group: "labs",
    step: "0.1",
  },
  {
    key: "hematocrito",
    label: "Hematocrito",
    unit: "%",
    group: "labs",
    step: "0.1",
  },
  {
    key: "leucocitos",
    label: "Leucocitos",
    unit: "/µL",
    group: "labs",
  },
  {
    key: "plaquetas",
    label: "Plaquetas",
    unit: "/µL",
    group: "labs",
  },
  {
    key: "embarazo_sangre",
    label: "Prueba de embarazo en sangre",
    unit: "",
    group: "pregnancy",
    kind: "pregnancy",
    hint: "β-hCG sérica",
  },
  {
    key: "embarazo_orina",
    label: "Prueba de embarazo en orina",
    unit: "",
    group: "pregnancy",
    kind: "pregnancy",
    hint: "hCG urinaria",
  },
];

export const MEASUREMENT_KEYS = new Set(
  MEASUREMENT_FIELDS.map((field) => field.key)
);

export const PREGNANCY_KEYS = ["embarazo_sangre", "embarazo_orina"] as const;

export const PREGNANCY_LABEL: Record<0 | 1, string> = {
  0: "Negativo",
  1: "Positivo",
};

export function fieldsInGroup(group: MeasurementGroup): MeasurementField[] {
  return MEASUREMENT_FIELDS.filter((field) => field.group === group);
}

/** IMC = peso (kg) / estatura (m)². */
export function computeBmi(
  pesoKg: number | undefined,
  estaturaCm: number | undefined
): number | null {
  if (
    pesoKg == null ||
    estaturaCm == null ||
    !Number.isFinite(pesoKg) ||
    !Number.isFinite(estaturaCm) ||
    pesoKg <= 0 ||
    estaturaCm <= 0
  ) {
    return null;
  }
  const meters = estaturaCm / 100;
  return Math.round((pesoKg / (meters * meters)) * 10) / 10;
}

export function withComputedBmi(
  labs: Record<string, number>
): Record<string, number> {
  const next = { ...labs };
  const bmi = computeBmi(next.peso, next.estatura);
  if (bmi == null) delete next.imc;
  else next.imc = bmi;
  return next;
}

export function extraLaboratories(
  labs: Record<string, number>
): Record<string, number> {
  const extra: Record<string, number> = {};
  for (const [key, value] of Object.entries(labs)) {
    if (!MEASUREMENT_KEYS.has(key)) extra[key] = value;
  }
  return extra;
}

export function catalogLaboratories(
  labs: Record<string, number>
): Record<string, number> {
  const catalog: Record<string, number> = {};
  for (const [key, value] of Object.entries(labs)) {
    if (MEASUREMENT_KEYS.has(key)) catalog[key] = value;
  }
  return catalog;
}

export function mergeLaboratories(
  catalog: Record<string, number>,
  extra: Record<string, number>
): Record<string, number> {
  return withComputedBmi({ ...catalog, ...extra });
}

export function hasPregnancyResult(labs: Record<string, number>): boolean {
  return PREGNANCY_KEYS.some((key) => key in labs && Number.isFinite(labs[key]));
}
