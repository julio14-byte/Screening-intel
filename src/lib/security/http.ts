import { NextResponse } from "next/server";

/**
 * Respuesta de error para el cliente sin filtrar detalles internos
 * (mensajes de Postgres, rutas, nombres de tablas). El detalle va al log.
 */
export function serverError(
  scope: string,
  error: unknown,
  publicMessage = "No se pudo completar la operación.",
  status = 500
) {
  const detail =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);
  console.error(`[${scope}]`, detail);
  return NextResponse.json({ error: publicMessage }, { status });
}

export async function readJsonBody(
  request: Request,
  maxBytes = 1_000_000
): Promise<{ ok: true; body: unknown } | { ok: false; response: NextResponse }> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > maxBytes) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Solicitud demasiado grande." }, { status: 413 }),
    };
  }
  try {
    const text = await request.text();
    if (text.length > maxBytes) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Solicitud demasiado grande." }, { status: 413 }),
      };
    }
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "JSON inválido." }, { status: 400 }),
    };
  }
}
