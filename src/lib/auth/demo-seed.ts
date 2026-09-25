import { getDemoCredentials } from "@/lib/auth/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingIwrsSchema } from "@/lib/iwrs/model";
import type { SupabaseClient } from "@supabase/supabase-js";

const DEMO_PATIENTS = [
  {
    id: "11111111-1111-1111-1111-111111111101",
    first_name: "María",
    last_name: "González",
    birth_date: "1962-04-12",
    gender: "female" as const,
    subject_code: "10001",
    ethnicity: "mestizo",
    phone: "+54 11 5555-0101",
    email: "maria.g@example.com",
    address_line: "Av. Santa Fe 1234",
    address_city: "CABA",
    address_state: "Buenos Aires",
    address_postal_code: "1059",
    address_country: "AR",
  },
  {
    id: "11111111-1111-1111-1111-111111111102",
    first_name: "Carlos",
    last_name: "Fernández",
    birth_date: "1975-09-30",
    gender: "male" as const,
    subject_code: "10002",
    ethnicity: "blanco",
    phone: "+54 11 5555-0102",
    email: "carlos.f@example.com",
    address_city: "CABA",
    address_country: "AR",
  },
  {
    id: "11111111-1111-1111-1111-111111111103",
    first_name: "Lucía",
    last_name: "Martínez",
    birth_date: "1988-01-22",
    gender: "female" as const,
    subject_code: "10003",
    ethnicity: "mestizo",
    phone: "+54 11 5555-0103",
    email: "lucia.m@example.com",
    address_country: "AR",
  },
  {
    id: "11111111-1111-1111-1111-111111111104",
    first_name: "Jorge",
    last_name: "Pereyra",
    birth_date: "1954-11-03",
    gender: "male" as const,
    subject_code: "10004",
    ethnicity: "indigena",
    phone: "+54 11 5555-0104",
    email: "jorge.p@example.com",
    address_country: "AR",
  },
  {
    id: "11111111-1111-1111-1111-111111111105",
    first_name: "Ana",
    last_name: "Suárez",
    birth_date: "1970-06-17",
    gender: "female" as const,
    subject_code: "10005",
    ethnicity: "afrodescendiente",
    phone: "+54 11 5555-0105",
    email: "ana.s@example.com",
    address_country: "AR",
  },
  {
    id: "11111111-1111-1111-1111-111111111106",
    first_name: "Ricardo",
    last_name: "López",
    birth_date: "1948-02-08",
    gender: "male" as const,
    subject_code: "10006",
    ethnicity: "mestizo",
    phone: "+54 11 5555-0106",
    email: "ricardo.l@example.com",
    address_country: "AR",
  },
  {
    id: "11111111-1111-1111-1111-111111111107",
    first_name: "Valentina",
    last_name: "Ríos",
    birth_date: "1995-08-25",
    gender: "female" as const,
    subject_code: "10007",
    ethnicity: "blanco",
    phone: "+54 11 5555-0107",
    email: "valentina.r@example.com",
    address_country: "AR",
  },
  {
    id: "11111111-1111-1111-1111-111111111108",
    first_name: "Héctor",
    last_name: "Domínguez",
    birth_date: "1966-12-01",
    gender: "male" as const,
    subject_code: "10008",
    ethnicity: "mestizo",
    phone: "+54 11 5555-0108",
    email: "hector.d@example.com",
    address_country: "AR",
  },
];

const DEMO_PROFILES = [
  {
    patient_id: "11111111-1111-1111-1111-111111111101",
    conditions: ["diabetes tipo 2", "hipertensión"],
    medications: ["metformina", "enalapril"],
    laboratories: {
      glucosa: 145,
      hba1c: 7.8,
      creatinina: 0.9,
      pas: 138,
      pad: 82,
      frecuencia_cardiaca: 76,
      temperatura: 36.6,
      frecuencia_respiratoria: 16,
      peso: 72,
      estatura: 158,
      imc: 28.8,
      tgo: 28,
      tgp: 32,
      hemoglobina: 13.2,
      hematocrito: 39,
      leucocitos: 6200,
      plaquetas: 245000,
      embarazo_sangre: 0,
    },
    anamnesis: {
      diagnoses: [
        {
          id: "dx-maria-dm2",
          name: "diabetes tipo 2",
          diagnosed_at: "2014-03-11",
          symptoms: "Poliuria y fatiga matinal",
          severity: "moderada",
          evolution: "Control parcial con metformina; HbA1c en descenso",
        },
        {
          id: "dx-maria-hta",
          name: "hipertensión",
          diagnosed_at: "2016-08-02",
          symptoms: "Cefalea ocasional",
          severity: "leve",
          evolution: "Estable con enalapril",
        },
      ],
      surgeries: "Colecistectomía laparoscópica (2018)",
      hospitalizations: "Internación breve por crisis hipertensiva (2021)",
      medications: [
        {
          id: "med-maria-met",
          name: "metformina",
          kind: "farmaco",
          dose: "850 mg",
          schedule: "desayuno y cena",
          status: "current",
        },
        {
          id: "med-maria-ena",
          name: "enalapril",
          kind: "farmaco",
          dose: "10 mg",
          schedule: "8:00",
          status: "current",
        },
      ],
      allergies: [
        {
          id: "alg-maria-pen",
          substance: "penicilina",
          category: "medicamento",
          reaction: "rash",
        },
      ],
    },
  },
  {
    patient_id: "11111111-1111-1111-1111-111111111102",
    conditions: ["diabetes tipo 2"],
    medications: ["metformina", "insulina"],
    laboratories: {
      glucosa: 190,
      hba1c: 9.1,
      creatinina: 1.1,
      pas: 142,
      pad: 88,
      frecuencia_cardiaca: 80,
      temperatura: 36.8,
      frecuencia_respiratoria: 18,
      peso: 91,
      estatura: 175,
      imc: 29.7,
      tgo: 35,
      tgp: 40,
      hemoglobina: 14.1,
      hematocrito: 42,
      leucocitos: 7100,
      plaquetas: 210000,
    },
  },
  {
    patient_id: "11111111-1111-1111-1111-111111111103",
    conditions: ["asma"],
    medications: ["salbutamol"],
    laboratories: {
      glucosa: 92,
      pas: 118,
      pad: 74,
      frecuencia_cardiaca: 72,
      temperatura: 36.5,
      frecuencia_respiratoria: 14,
      peso: 61,
      estatura: 164,
      imc: 22.7,
      hemoglobina: 12.8,
      embarazo_orina: 0,
    },
  },
  {
    patient_id: "11111111-1111-1111-1111-111111111104",
    conditions: ["hipertensión", "insuficiencia renal"],
    medications: ["losartán", "furosemida"],
    laboratories: {
      creatinina: 2.4,
      glucosa: 118,
      pas: 152,
      pad: 94,
      frecuencia_cardiaca: 84,
      temperatura: 36.4,
      frecuencia_respiratoria: 16,
      peso: 78,
      estatura: 170,
      imc: 27,
      tgo: 22,
      tgp: 25,
      hemoglobina: 11.4,
    },
  },
  {
    patient_id: "11111111-1111-1111-1111-111111111105",
    conditions: ["diabetes tipo 2", "obesidad"],
    medications: ["metformina"],
    laboratories: {
      hba1c: 8.2,
      glucosa: 162,
      pas: 134,
      pad: 86,
      peso: 98,
      estatura: 162,
      imc: 37.3,
      hemoglobina: 12.4,
      embarazo_sangre: 0,
    },
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
    patient_id: "11111111-1111-1111-1111-111111111103",
    protocol_id: "22222222-2222-2222-2222-222222222202",
    status: "screening" as const,
    match_score: 90,
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

async function createOrgForUser(
  admin: SupabaseClient,
  userId: string,
  email: string
): Promise<string> {
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({
      name: "Crisvia demo",
      plan_id: "starter",
      subscription_status: "trialing",
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      patient_limit: 50,
      protocol_limit: 3,
      user_limit: 1,
    })
    .select("id")
    .single();

  if (orgError || !org?.id) {
    throw new Error(`demo org: ${orgError?.message ?? "no se pudo crear"}`);
  }

  const { error: memberError } = await admin.from("organization_members").insert({
    organization_id: org.id,
    user_id: userId,
    role: "owner",
  });

  if (memberError && !memberError.message.toLowerCase().includes("duplicate")) {
    throw new Error(`demo membership: ${memberError.message} (${email})`);
  }

  return org.id as string;
}

async function resolveDemoClinicId(
  admin: SupabaseClient,
  userId?: string
): Promise<string> {
  if (userId) {
    const { data } = await admin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (data?.organization_id) return data.organization_id as string;
  }

  const demo = getDemoCredentials();
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", demo.email.trim().toLowerCase())
    .maybeSingle();

  if (profile?.id) {
    const { data: membership } = await admin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", profile.id)
      .limit(1)
      .maybeSingle();
    if (membership?.organization_id) {
      return membership.organization_id as string;
    }
    return createOrgForUser(admin, profile.id as string, demo.email);
  }

  if (userId) {
    return createOrgForUser(admin, userId, demo.email);
  }

  throw new Error(
    "demo seed: el usuario demo no tiene organización. Volvé a entrar con el login demo."
  );
}

/**
 * Inserta pacientes, protocolos y screenings de demo (idempotente).
 * Los asigna a la organización del usuario demo para que RLS los deje ver.
 * Requiere SUPABASE_SERVICE_ROLE_KEY.
 */
export async function ensureDemoPatientData(userId?: string): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  const admin = createAdminClient();
  const clinicId = await resolveDemoClinicId(admin, userId);

  let { error: patientsError } = await admin.from("patients").upsert(
    DEMO_PATIENTS.map((patient) => ({ ...patient, clinic_id: clinicId })),
    { onConflict: "id" }
  );
  if (
    patientsError &&
    /subject_code|ethnicity|phone|address_line/i.test(patientsError.message)
  ) {
    const retry = await admin.from("patients").upsert(
      DEMO_PATIENTS.map((patient) => ({
        id: patient.id,
        first_name: patient.first_name,
        last_name: patient.last_name,
        birth_date: patient.birth_date,
        gender: patient.gender,
        clinic_id: clinicId,
      })),
      { onConflict: "id" }
    );
    patientsError = retry.error;
  }

  if (patientsError) {
    throw new Error(`demo patients: ${patientsError.message}`);
  }

  const { error: profilesError } = await admin
    .from("clinical_profiles")
    .upsert(DEMO_PROFILES, { onConflict: "patient_id" });

  if (profilesError) {
    throw new Error(`demo profiles: ${profilesError.message}`);
  }

  const { error: protocolsError } = await admin.from("protocols").upsert(
    DEMO_PROTOCOLS.map((protocol) => ({ ...protocol, clinic_id: clinicId })),
    { onConflict: "id" }
  );

  if (protocolsError) {
    throw new Error(`demo protocols: ${protocolsError.message}`);
  }

  const { error: screeningsError } = await admin
    .from("screenings")
    .upsert(DEMO_SCREENINGS, { onConflict: "patient_id,protocol_id" });

  if (screeningsError) {
    throw new Error(`demo screenings: ${screeningsError.message}`);
  }

  await seedDemoIwrs(admin, clinicId);
}

const DEMO_GLP1_PROTOCOL_ID = "22222222-2222-2222-2222-222222222201";
const DEMO_HTA_PROTOCOL_ID = "22222222-2222-2222-2222-222222222202";

/** GLP1: IWRS del centro. HTA: IWRS del sponsor (Lilly/IRT) para registrar kit. */
async function seedDemoIwrs(
  admin: SupabaseClient,
  clinicId: string
): Promise<void> {
  const glp1 = {
    protocol_id: DEMO_GLP1_PROTOCOL_ID,
    organization_id: clinicId,
    enabled: true,
    blinding: "open",
    block_size: 4,
    stratify_gender: true,
    source: "site",
    sponsor_vendor: "",
    sponsor_study_id: "",
    sponsor_site_id: "",
  };
  const hta = {
    protocol_id: DEMO_HTA_PROTOCOL_ID,
    organization_id: clinicId,
    enabled: true,
    blinding: "double",
    block_size: 4,
    stratify_gender: true,
    source: "sponsor",
    sponsor_vendor: "lilly",
    sponsor_study_id: "HTA-CMB-205",
    sponsor_site_id: "AR-SITE-01",
  };

  let { error: configError } = await admin
    .from("protocol_iwrs_config")
    .upsert([glp1, hta], { onConflict: "protocol_id" });

  if (
    configError &&
    /source|sponsor_vendor|sponsor_study_id|sponsor_site_id/i.test(
      configError.message
    )
  ) {
    const retry = await admin.from("protocol_iwrs_config").upsert(
      [
        {
          protocol_id: DEMO_GLP1_PROTOCOL_ID,
          organization_id: clinicId,
          enabled: true,
          blinding: "open",
          block_size: 4,
          stratify_gender: true,
        },
      ],
      { onConflict: "protocol_id" }
    );
    configError = retry.error;
  }

  if (configError) {
    if (isMissingIwrsSchema(configError.message)) return;
    throw new Error(`demo iwrs config: ${configError.message}`);
  }

  const { error: armsError } = await admin.from("protocol_arms").upsert(
    [
      {
        organization_id: clinicId,
        protocol_id: DEMO_GLP1_PROTOCOL_ID,
        code: "A",
        name: "Activo",
        allocation_weight: 1,
        sort_order: 0,
      },
      {
        organization_id: clinicId,
        protocol_id: DEMO_GLP1_PROTOCOL_ID,
        code: "B",
        name: "Placebo",
        allocation_weight: 1,
        sort_order: 1,
      },
    ],
    { onConflict: "protocol_id,code" }
  );

  if (armsError) {
    if (isMissingIwrsSchema(armsError.message)) return;
    throw new Error(`demo iwrs arms: ${armsError.message}`);
  }
}
