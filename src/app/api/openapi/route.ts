import { NextResponse } from "next/server";
import { buildOpenApiSpec } from "@/lib/openapi/spec";

export const runtime = "nodejs";

/** Especificación OpenAPI 3.0 en JSON (Swagger UI). */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || origin;

  const spec = buildOpenApiSpec(baseUrl);

  return NextResponse.json(spec, {
    headers: {
      "Cache-Control": "public, max-age=300",
    },
  });
}
