import { NextResponse } from "next/server";
import { serverError } from "@/lib/security/http";
import { rateLimit, tooManyRequests } from "@/lib/security/rate-limit";
import { z } from "zod";
import {
  AuthorizationError,
  requirePermission,
} from "@/lib/rbac/require-permission";
import { redactIdentifiers } from "@/lib/privacy/redact";
import { extractClinicalProfileFromNotes } from "@/lib/profile/extractClinicalProfileFromNotes";

export const runtime = "nodejs";

const bodySchema = z.object({
  notes: z.string().trim().min(1).max(8000),
  known_names: z.array(z.string().trim().min(1).max(120)).max(8).optional(),
});

export async function POST(request: Request) {
  let userId = "";
  try {
    const ctx = await requirePermission("profiles:write");
    userId = ctx.user.id;
  } catch (e) {
    if (e instanceof AuthorizationError) {
      const status = e.code === "UNAUTHENTICATED" ? 401 : 403;
      return NextResponse.json({ error: e.message }, { status });
    }
    throw e;
  }

  const limited = await rateLimit(`ai:extract-profile:${userId}`, 40, 600);
  if (!limited.allowed) return tooManyRequests(limited);

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
    const knownNames = parsed.data.known_names;
    const masked = redactIdentifiers(parsed.data.notes, { names: knownNames });
    const draft = await extractClinicalProfileFromNotes(parsed.data.notes, {
      knownNames,
    });
    return NextResponse.json({
      draft,
      charCount: parsed.data.notes.length,
      masked: masked.total,
    });
  } catch (err) {
    return serverError(
      "patients/profile/extract",
      err,
      "No se pudo extraer el perfil clínico."
    );
  }
}
