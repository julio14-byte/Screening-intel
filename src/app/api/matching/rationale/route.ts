import { NextResponse } from "next/server";
import { z } from "zod";
import { generateMatchRationale } from "@/lib/matching/generateMatchRationale";
import {
  AuthorizationError,
  requirePermission,
} from "@/lib/rbac/require-permission";

export const runtime = "nodejs";

const criterionSchema = z.object({
  type: z.enum(["inclusion", "exclusion"]),
  criterion: z.string().min(1).max(500),
  status: z.enum(["pass", "fail", "missing"]),
  detail: z.string().max(500),
});

const bodySchema = z.object({
  protocol: z.object({
    code_name: z.string().min(1).max(80),
    title: z.string().min(1).max(300),
  }),
  patient: z.object({
    first_name: z.string().min(1).max(120),
    last_name: z.string().min(1).max(120),
    birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    gender: z.enum(["male", "female", "other"]),
  }),
  verdict: z.enum(["eligible", "pending", "excluded"]),
  score: z.number().min(0).max(100),
  details: z.array(criterionSchema).max(80),
  context: z.enum(["match", "rematch"]).optional(),
});

export async function POST(request: Request) {
  try {
    await requirePermission("screenings:read");
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
    const rationale = await generateMatchRationale(parsed.data);
    return NextResponse.json({ rationale });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Error al generar justificación clínica.",
      },
      { status: 500 }
    );
  }
}
