import { NextResponse } from "next/server";
import {
  extractProtocolCriteriaFromText,
  extractTextFromPdf,
} from "@/lib/protocols/extractCriteria";
import {
  AuthorizationError,
  requirePermission,
} from "@/lib/rbac/require-permission";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requirePermission("protocols:write");
  } catch (e) {
    if (e instanceof AuthorizationError) {
      const status = e.code === "UNAUTHENTICATED" ? 401 : 403;
      return NextResponse.json({ error: e.message }, { status });
    }
    throw e;
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo requerido." }, { status: 400 });
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
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al extraer criterios." },
      { status: 500 }
    );
  }
}
