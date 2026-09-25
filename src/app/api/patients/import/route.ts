import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/server";
import {
  AuthorizationError,
  requirePermission,
} from "@/lib/rbac/require-permission";
import { isMissingDemographicsColumn } from "@/lib/profile/demographics";
import type { ParsedPatientRow } from "@/lib/import/parsePatientCsv";

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

  const body = (await request.json()) as { patients?: ParsedPatientRow[] };
  const rows = body.patients ?? [];

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
    return NextResponse.json({ error: orgError.message }, { status: 500 });
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
          errors.push(`Fila ${index + 2}: ${updated.error.message}`);
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
        errors.push(
          `Fila ${index + 2}: ${inserted.error?.message ?? "error al crear paciente"}`
        );
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
        errors.push(`Fila ${index + 2} perfil: ${profileError.message}`);
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
