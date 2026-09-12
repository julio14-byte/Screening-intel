import { NextResponse } from "next/server";
import { runIcd11NormalizeColloquial } from "@/lib/icd11/services";
import {
  AuthorizationError,
  requirePermission,
} from "@/lib/rbac/require-permission";

export async function GET(request: Request) {
  try {
    await requirePermission("patients:read");
  } catch (e) {
    if (e instanceof AuthorizationError) {
      const status = e.code === "UNAUTHENTICATED" ? 401 : 403;
      return NextResponse.json({ error: e.message }, { status });
    }
    throw e;
  }

  const colloquial = new URL(request.url).searchParams.get("q")?.trim();

  if (!colloquial) {
    return NextResponse.json(
      { error: "Parámetro q requerido (término coloquial)." },
      { status: 400 }
    );
  }

  try {
    const result = await runIcd11NormalizeColloquial(colloquial);
    if ("error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error ICD-11";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
