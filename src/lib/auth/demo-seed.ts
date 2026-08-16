import { createAdminClient } from "@/lib/supabase/admin";

const DEMO_PATIENTS = [
  {
    id: "11111111-1111-1111-1111-111111111101",
    first_name: "María",
    last_name: "González",
    birth_date: "1962-04-12",
    gender: "female" as const,
  },
  {
    id: "11111111-1111-1111-1111-111111111102",
    first_name: "Carlos",
    last_name: "Fernández",
    birth_date: "1975-09-30",
    gender: "male" as const,
  },
  {
    id: "11111111-1111-1111-1111-111111111103",
    first_name: "Lucía",
    last_name: "Martínez",
    birth_date: "1988-01-22",
    gender: "female" as const,
  },
  {
    id: "11111111-1111-1111-1111-111111111104",
    first_name: "Jorge",
    last_name: "Pereyra",
    birth_date: "1954-11-03",
    gender: "male" as const,
  },
  {
    id: "11111111-1111-1111-1111-111111111105",
    first_name: "Ana",
    last_name: "Suárez",
    birth_date: "1970-06-17",
    gender: "female" as const,
  },
  {
    id: "11111111-1111-1111-1111-111111111106",
    first_name: "Ricardo",
    last_name: "López",
    birth_date: "1948-02-08",
    gender: "male" as const,
  },
  {
    id: "11111111-1111-1111-1111-111111111107",
    first_name: "Valentina",
    last_name: "Ríos",
    birth_date: "1995-08-25",
    gender: "female" as const,
  },
  {
    id: "11111111-1111-1111-1111-111111111108",
    first_name: "Héctor",
    last_name: "Domínguez",
    birth_date: "1966-12-01",
    gender: "male" as const,
  },
];

const DEMO_PROFILES = [
  {
    patient_id: "11111111-1111-1111-1111-111111111101",
    conditions: ["diabetes tipo 2", "hipertensión"],
    medications: ["metformina", "enalapril"],
    laboratories: { glucosa: 145, hba1c: 7.8, creatinina: 0.9 },
  },
  {
    patient_id: "11111111-1111-1111-1111-111111111102",
    conditions: ["diabetes tipo 2"],
    medications: ["metformina", "insulina"],
    laboratories: { glucosa: 190, hba1c: 9.1, creatinina: 1.1 },
  },
  {
    patient_id: "11111111-1111-1111-1111-111111111103",
    conditions: ["asma"],
    medications: ["salbutamol"],
    laboratories: { glucosa: 92 },
  },
  {
    patient_id: "11111111-1111-1111-1111-111111111104",
    conditions: ["hipertensión", "insuficiencia renal"],
    medications: ["losartán", "furosemida"],
    laboratories: { creatinina: 2.4, glucosa: 118 },
  },
  {
    patient_id: "11111111-1111-1111-1111-111111111105",
    conditions: ["diabetes tipo 2", "obesidad"],
    medications: ["metformina"],
    laboratories: { hba1c: 8.2 },
  },
  {
    patient_id: "11111111-1111-1111-1111-111111111106",
    conditions: ["epoc", "hipertensión"],
    medications: ["tiotropio", "amlodipina"],
    laboratories: { glucosa: 101, creatinina: 1.3 },
  },
  {
    patient_id: "11111111-1111-1111-1111-111111111107",
    conditions: ["migraña"],
    medications: ["ibuprofeno"],
    laboratories: {},
  },
];

const DEMO_PROTOCOLS = [
  {
    id: "22222222-2222-2222-2222-222222222201",
    title: "Estudio fase III de agonista GLP-1 en diabetes tipo 2 no controlada",
    code_name: "GLP1-DM2-301",
    inclusion_criteria: {
      min_age: 18,
      max_age: 75,
      gender: "any",
      required_conditions: ["diabetes tipo 2"],
      required_labs: [
        { name: "hba1c", min: 7, max: 10.5, unit: "%" },
        { name: "glucosa", min: 110, max: 250, unit: "mg/dL" },
      ],
    },
    exclusion_criteria: {
      excluded_conditions: ["insuficiencia renal"],
      excluded_medications: ["insulina"],
    },
    status: "active" as const,
  },
  {
    id: "22222222-2222-2222-2222-222222222202",
    title: "Antihipertensivo combinado en hipertensión esencial",
    code_name: "HTA-CMB-205",
    inclusion_criteria: {
      min_age: 40,
      max_age: 80,
      gender: "any",
      required_conditions: ["hipertensión"],
      required_labs: [{ name: "creatinina", min: 0.5, max: 1.5, unit: "mg/dL" }],
    },
    exclusion_criteria: {
      excluded_conditions: ["insuficiencia renal"],
      excluded_medications: [],
    },
    status: "active" as const,
  },
  {
    id: "22222222-2222-2222-2222-222222222203",
    title: "Broncodilatador de acción prolongada en EPOC moderada a severa",
    code_name: "EPOC-LAB-112",
    inclusion_criteria: {
      min_age: 45,
      max_age: 85,
      gender: "any",
      required_conditions: ["epoc"],
      required_labs: [],
    },
    exclusion_criteria: {
      excluded_conditions: ["asma"],
      excluded_medications: [],
    },
    status: "active" as const,
  },
];

const DEMO_SCREENINGS = [
  {
    patient_id: "11111111-1111-1111-1111-111111111101",
    protocol_id: "22222222-2222-2222-2222-222222222201",
    status: "screening" as const,
    match_score: 100,
    match_details: [],
  },
  {
    patient_id: "11111111-1111-1111-1111-111111111102",
    protocol_id: "22222222-2222-2222-2222-222222222201",
    status: "screen_failure" as const,
    match_score: 60,
    match_details: [],
  },
  {
    patient_id: "11111111-1111-1111-1111-111111111105",
    protocol_id: "22222222-2222-2222-2222-222222222201",
    status: "pre_screening" as const,
    match_score: 80,
    match_details: [],
  },
  {
    patient_id: "11111111-1111-1111-1111-111111111106",
    protocol_id: "22222222-2222-2222-2222-222222222203",
    status: "randomized" as const,
    match_score: 100,
    match_details: [],
  },
  {
    patient_id: "11111111-1111-1111-1111-111111111104",
    protocol_id: "22222222-2222-2222-2222-222222222202",
    status: "screen_failure" as const,
    match_score: 40,
    match_details: [],
  },
];

/**
 * Inserta pacientes, protocolos y screenings de demo (idempotente).
 * Requiere SUPABASE_SERVICE_ROLE_KEY.
 */
export async function ensureDemoPatientData(): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  const admin = createAdminClient();

  const { error: patientsError } = await admin
    .from("patients")
    .upsert(DEMO_PATIENTS, { onConflict: "id", ignoreDuplicates: true });

  if (patientsError) {
    throw new Error(`demo patients: ${patientsError.message}`);
  }

  const { error: profilesError } = await admin
    .from("clinical_profiles")
    .upsert(DEMO_PROFILES, { onConflict: "patient_id" });

  if (profilesError) {
    throw new Error(`demo profiles: ${profilesError.message}`);
  }

  const { error: protocolsError } = await admin
    .from("protocols")
    .upsert(DEMO_PROTOCOLS, { onConflict: "id", ignoreDuplicates: true });

  if (protocolsError) {
    throw new Error(`demo protocols: ${protocolsError.message}`);
  }

  const { error: screeningsError } = await admin
    .from("screenings")
    .upsert(DEMO_SCREENINGS, { onConflict: "patient_id,protocol_id" });

  if (screeningsError) {
    throw new Error(`demo screenings: ${screeningsError.message}`);
  }
}
