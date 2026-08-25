import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AuthorizationError,
  requirePermission,
} from "@/lib/rbac/require-permission";
import { extractClinicalProfileFromNotes } from "@/lib/profile/extractClinicalProfileFromNotes";

export const runtime = "nodejs";

const bodySchema = z.object({
  notes: z.string().trim().min(1).max(8000),
});

export async function POST(request: Request) {
  try {
    await requirePermission("profiles:write");
  } catch (e) {
    if (e instanceof AuthorizationError) {
      const status = e.code === "UNAUTHENTICATED" ? 401 : 403;
      return NextResponse.json({ error: e.message }, { status });
    }
    throw e;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ");
    return NextResponse.json({ error: msg || "Datos inválidos." }, { status: 400 });
  }

  try {
    const draft = await extractClinicalProfileFromNotes(parsed.data.notes);
    return NextResponse.json({
      draft,
      charCount: parsed.data.notes.length,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Error al extraer perfil clínico.",
      },
      { status: 500 }
    );
  }
}
