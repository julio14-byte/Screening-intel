import { NextResponse } from "next/server";
import {
  AuthorizationError,
  requirePermission,
} from "@/lib/rbac/require-permission";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("patients:write");
  } catch (e) {
    if (e instanceof AuthorizationError) {
      const status = e.code === "UNAUTHENTICATED" ? 401 : 403;
      return NextResponse.json({ error: e.message }, { status });
    }
    throw e;
  }

  const { id } = await params;
  const supabase = await createClient();

  const { data: submission, error: fetchError } = await supabase
    .from("pre_screen_submissions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !submission) {
    return NextResponse.json({ error: "Candidato no encontrado." }, { status: 404 });
  }

  if (submission.status === "converted") {
    return NextResponse.json(
      { error: "Este candidato ya fue convertido." },
      { status: 409 }
    );
  }

  const profile = submission.extracted_profile as {
    conditions?: string[];
    medications?: string[];
    laboratories?: Record<string, number>;
  };

  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .insert({
      clinic_id: submission.organization_id,
      first_name: submission.first_name,
      last_name: submission.last_name,
      birth_date: submission.birth_date,
      gender: submission.gender,
    })
    .select("id")
    .single();

  if (patientError || !patient) {
    return NextResponse.json(
      { error: patientError?.message ?? "Error al crear paciente." },
      { status: 500 }
    );
  }

  await supabase.from("clinical_profiles").insert({
    patient_id: patient.id,
    conditions: profile.conditions ?? [],
    medications: profile.medications ?? [],
    laboratories: profile.laboratories ?? {},
  });

  if (submission.protocol_id) {
    const matchRow = (submission.match_results as { protocol_id: string; score: number }[]).find(
      (m) => m.protocol_id === submission.protocol_id
    );

    await supabase.from("screenings").insert({
      patient_id: patient.id,
      protocol_id: submission.protocol_id,
      status: "pre_screening",
      match_score: matchRow?.score ?? 0,
      match_details: [],
    });
  }

  await supabase
    .from("pre_screen_submissions")
    .update({
      status: "converted",
      converted_patient_id: patient.id,
    })
    .eq("id", id);

  return NextResponse.json({
    patientId: patient.id,
    message: "Candidato convertido a paciente.",
  });
}
