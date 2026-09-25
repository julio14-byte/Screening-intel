import { NextResponse } from "next/server";
import { z } from "zod";
import { opsContext, opsSchemaErrorResponse } from "@/lib/ops/http";
import { canSendEproInvite } from "@/lib/rbac/types";
import {
  EPRO_INVITE_MS,
  EPRO_MIGRATION_HINT,
  hashOpaqueToken,
  isMissingEproMobileSchema,
  newOpaqueToken,
} from "@/lib/epro-app/crypto";

const schema = z.object({
  patient_id: z.string().uuid(),
});

export async function POST(request: Request) {
  const gate = await opsContext(true);
  if (!gate.ok) return gate.response;
  if (!canSendEproInvite(gate.ctx.role)) {
    return NextResponse.json(
      {
        error:
          "El coordinador genera la invitación ePRO desde el expediente. El paciente no se registra solo.",
      },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Paciente inválido." }, { status: 400 });
  }

  const { data: patient, error: patientError } = await gate.supabase
    .from("patients")
    .select("id, clinic_id, subject_code, birth_date")
    .eq("id", parsed.data.patient_id)
    .eq("clinic_id", gate.organizationId)
    .maybeSingle();

  if (patientError) return opsSchemaErrorResponse(patientError);
  if (!patient) {
    return NextResponse.json({ error: "Paciente fuera de tu centro." }, { status: 404 });
  }
  if (!patient.subject_code) {
    return NextResponse.json(
      { error: "Este paciente no tiene código de sujeto. Guardá el expediente primero." },
      { status: 400 }
    );
  }
  if (!patient.birth_date) {
    return NextResponse.json(
      { error: "Falta la fecha de nacimiento en el EDC para validar la activación." },
      { status: 400 }
    );
  }

  await gate.supabase
    .from("epro_activation_invites")
    .update({ used_at: new Date().toISOString() })
    .eq("patient_id", patient.id)
    .is("used_at", null);

  const token = newOpaqueToken();
  const expiresAt = new Date(Date.now() + EPRO_INVITE_MS).toISOString();
  const { error } = await gate.supabase.from("epro_activation_invites").insert({
    organization_id: gate.organizationId,
    patient_id: patient.id,
    token_hash: hashOpaqueToken(token),
    expires_at: expiresAt,
    created_by: gate.ctx.user.id,
  });

  if (error) {
    if (isMissingEproMobileSchema(error.message)) {
      return NextResponse.json(
        { error: `${error.message}. ${EPRO_MIGRATION_HINT}` },
        { status: 500 }
      );
    }
    return opsSchemaErrorResponse(error);
  }

  const origin = new URL(request.url).origin;
  return NextResponse.json({
    url: `${origin}/epro-app/activar/${token}`,
    expires_at: expiresAt,
    subject_code: patient.subject_code,
  });
}
