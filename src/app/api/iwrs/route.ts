import { NextResponse } from "next/server";
import { iwrsContext, iwrsSchemaErrorResponse } from "@/lib/iwrs/http";
import { listIwrsCatalog } from "@/lib/iwrs/catalog";

export async function GET(request: Request) {
  const gate = await iwrsContext("auth");
  if (!gate.ok) return gate.response;

  const protocolId = new URL(request.url).searchParams.get("protocol_id");
  const catalog = await listIwrsCatalog(
    gate.supabase,
    gate.organizationId,
    protocolId
  );

  if ("error" in catalog && catalog.error) {
    return iwrsSchemaErrorResponse(catalog.error);
  }

  return NextResponse.json(catalog);
}
