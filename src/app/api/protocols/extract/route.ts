import { NextResponse } from "next/server";
import { serverError } from "@/lib/security/http";
import { rateLimit, tooManyRequests } from "@/lib/security/rate-limit";
import {
  extractProtocolCriteriaFromText,
  extractTextFromPdf,
} from "@/lib/protocols/extractCriteria";
import {
  AuthorizationError,
  requirePermission,
} from "@/lib/rbac/require-permission";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  let userId = "";
  try {
    const ctx = await requirePermission("protocols:write");
    userId = ctx.user.id;
  } catch (e) {
    if (e instanceof AuthorizationError) {
      const status = e.code === "UNAUTHENTICATED" ? 401 : 403;
      return NextResponse.json({ error: e.message }, { status });
    }
    throw e;
  }

  const limited = await rateLimit(`ai:extract-protocol:${userId}`, 20, 600);
  if (!limited.allowed) return tooManyRequests(limited);

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_UPLOAD_BYTES + 100_000) {
    return NextResponse.json({ error: "El archivo supera 10 MB." }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo requerido." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "El archivo supera 10 MB." }, { status: 413 });
  }

  const name = file.name.toLowerCase();
  let text = "";

  try {
    if (name.endsWith(".pdf")) {
      const buffer = await file.arrayBuffer();
      text = await extractTextFromPdf(buffer);
    } else if (name.endsWith(".txt")) {
      text = await file.text();
    } else {
      return NextResponse.json(
        { error: "Formato no soportado. Usá PDF o TXT." },
        { status: 400 }
      );
    }

    const draft = await extractProtocolCriteriaFromText(text);
    return NextResponse.json({ draft, textLength: text.length });
  } catch (err) {
    return serverError("protocols/extract", err, "No se pudo extraer los criterios.");
  }
}
