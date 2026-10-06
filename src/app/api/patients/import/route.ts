import { NextResponse } from "next/server";
import { serverError } from "@/lib/security/http";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/server";
import {
  AuthorizationError,
  requirePermission,
} from "@/lib/rbac/require-permission";
import { isMissingDemographicsColumn } from "@/lib/profile/demographics";
import type { ParsedPatientRow } from "@/lib/import/parsePatientCsv";
import { readJsonBody } from "@/lib/security/http";
import { z } from "zod";

const MAX_IMPORT_ROWS = 2000;

const short = (max: number) => z.string().trim().max(max);

const rowSchema = z.object({
  first_name: short(120).min(1),
  last_name: short(120).min(1),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(["male", "female", "other"]),
  phone: short(40).optional(),
  email: short(254).optional(),
  ethnicity: short(60).optional(),
  subject_code: short(60).optional(),
  address_line: short(200).optional(),
  address_city: short(120).optional(),
  conditions: z.array(short(200)).max(60).default([]),
  medications: z.array(short(200)).max(60).default([]),
  laboratories: z.record(z.string().max(60), z.number().finite()).default({}),
});

const bodySchema = z.object({
  patients: z.array(rowSchema).max(MAX_IMPORT_ROWS),
});

function rowError(index: number, message: string | undefined, fallback: string) {
  const safe = message && /Límite del plan/i.test(message) ? message : fallback;
  return `Fila ${index + 2}: ${safe}`;
}

export async function POST(request: Request) {
  try {
    await requirePermission("patients:write");
  } catch (e) {
    if (e instanceof AuthorizationError) {
      const status = e.code === "UNAUTHENTICATED" ? 401 : 403;
      return NextResponse.json({ error: e.message }, { status });
    }
    throw e;
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const parsedBody = await readJsonBody(request, 5_000_000);
  if (!parsedBody.ok) return parsedBody.response;
  const parsed = bodySchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: `Formato inválido o más de ${MAX_IMPORT_ROWS} filas. Revisa el archivo e inténtalo de nuevo.`,
      },
      { status: 400 }
    );
  }
  const rows = parsed.data.patients as ParsedPatientRow[];

  if (!rows.length) {
    return NextResponse.json({ error: "No hay filas para importar." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: membership, error: orgError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (orgError) {
    return serverError("patients/import", orgError);
  }

  const clinicId = membership?.organization_id as string | undefined;
  if (!clinicId) {
    return NextResponse.json(
      { error: "Sin organización. No se pueden importar pacientes." },
      { status: 403 }
    );
  }

  let imported = 0;
  const errors: string[] = [];

  for (const [index, row] of rows.entries()) {
    let patientId: string | null = null;

    if (row.subject_code) {
      const existing = await supabase
        .from("patients")
        .select("id")
        .eq("clinic_id", clinicId)
        .eq("subject_code", row.subject_code)
        .maybeSingle();
      if (existing.data?.id) {
        patientId = existing.data.id as string;
        const patch = {
          first_name: row.first_name,
          last_name: row.last_name,
          birth_date: row.birth_date,
          gender: row.gender,
          phone: row.phone || null,
          email: row.email || null,
          ethnicity: row.ethnicity || null,
          address_line: row.address_line || null,
          address_city: row.address_city || null,
        };
        const updated = await supabase
          .from("patients")
          .update(patch)
          .eq("id", patientId)
          .eq("clinic_id", clinicId);
        if (updated.error && !isMissingDemographicsColumn(updated.error.message)) {
          errors.push(rowError(index, updated.error.message, "no se pudo actualizar"));
          continue;
        }
      }
    }

    if (!patientId) {
      const fullRow = {
        clinic_id: clinicId,
        first_name: row.first_name,
        last_name: row.last_name,
        birth_date: row.birth_date,
        gender: row.gender,
        phone: row.phone || null,
        email: row.email || null,
        ethnicity: row.ethnicity || null,
        subject_code: row.subject_code || null,
        address_line: row.address_line || null,
        address_city: row.address_city || null,
      };
      let inserted = await supabase
        .from("patients")
        .insert(fullRow)
        .select("id")
        .single();
      if (
        inserted.error &&
        isMissingDemographicsColumn(inserted.error.message)
      ) {
        inserted = await supabase
          .from("patients")
          .insert({
            clinic_id: clinicId,
            first_name: row.first_name,
            last_name: row.last_name,
            birth_date: row.birth_date,
            gender: row.gender,
          })
          .select("id")
          .single();
      }
      if (inserted.error || !inserted.data) {
        errors.push(rowError(index, inserted.error?.message, "no se pudo crear el paciente"));
        continue;
      }
      patientId = inserted.data.id as string;
    }

    if (
      row.conditions.length ||
      row.medications.length ||
      Object.keys(row.laboratories).length
    ) {
      const { error: profileError } = await supabase.from("clinical_profiles").upsert(
        {
          patient_id: patientId,
          conditions: row.conditions,
          medications: row.medications,
          laboratories: row.laboratories,
        },
        { onConflict: "patient_id" }
      );

      if (profileError) {
        errors.push(rowError(index, profileError.message, "no se pudo guardar el perfil clínico"));
      }
    }

    imported += 1;
  }

  return NextResponse.json({
    imported,
    failed: errors.length,
    errors: errors.slice(0, 10),
  });
}
