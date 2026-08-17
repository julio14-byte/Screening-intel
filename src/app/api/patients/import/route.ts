import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/server";
import type { ParsedPatientRow } from "@/lib/import/parsePatientCsv";

export async function POST(request: Request) {
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
  let imported = 0;
  const errors: string[] = [];

  for (const [index, row] of rows.entries()) {
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .insert({
        first_name: row.first_name,
        last_name: row.last_name,
        birth_date: row.birth_date,
        gender: row.gender,
      })
      .select("id")
      .single();

    if (patientError || !patient) {
      errors.push(`Fila ${index + 2}: ${patientError?.message ?? "error al crear paciente"}`);
      continue;
    }

    if (
      row.conditions.length ||
      row.medications.length ||
      Object.keys(row.laboratories).length
    ) {
      const { error: profileError } = await supabase.from("clinical_profiles").insert({
        patient_id: patient.id,
        conditions: row.conditions,
        medications: row.medications,
        laboratories: row.laboratories,
      });

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
