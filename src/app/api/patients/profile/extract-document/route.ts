import { NextResponse } from "next/server";
import {
  AuthorizationError,
  requirePermission,
} from "@/lib/rbac/require-permission";
import {
  extractClinicalProfileFromImage,
  extractClinicalProfileFromPdfBuffer,
  parseExpedienteKind,
} from "@/lib/profile/extractClinicalProfileFromDocument";

export const runtime = "nodejs";
export const maxDuration = 60;

function mimeOf(file: File): string {
  const type = file.type.toLowerCase();
  if (type) return type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  return type;
}

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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "FormData inválido." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo requerido." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "El archivo está vacío." }, { status: 400 });
  }

  const kind = parseExpedienteKind(formData.get("kind"));
  const mime = mimeOf(file);

  try {
    if (mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const { draft, textLength } = await extractClinicalProfileFromPdfBuffer(
        await file.arrayBuffer(),
        kind
      );
      return NextResponse.json({
        draft,
        source: "pdf",
        textLength,
      });
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    const imageMime =
      mime === "image/jpg" ? "image/jpeg" : mime;
    const draft = await extractClinicalProfileFromImage({
      mime: imageMime,
      bytes: buffer,
      kind,
    });
    return NextResponse.json({
      draft,
      source: "image",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al extraer el documento.";
    const status = /supera|no tiene texto|Usa JPEG|está vacío|HEIC|no está soportado/i.test(
      message
    )
      ? 400
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
