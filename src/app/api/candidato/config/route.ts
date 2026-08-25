import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/screening-services";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgSlug = searchParams.get("org")?.trim().toLowerCase();
  const protocolCode = searchParams.get("protocolo")?.trim();

  if (!orgSlug) {
    return NextResponse.json({ error: "Parámetro org requerido." }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data: org, error } = await supabase
    .from("organizations")
    .select("id, name, slug, portal_enabled")
    .eq("slug", orgSlug)
    .maybeSingle();

  if (error || !org) {
    return NextResponse.json(
      { error: "Centro de investigación no encontrado." },
      { status: 404 }
    );
  }

  if (!org.portal_enabled) {
    return NextResponse.json(
      { error: "El portal de candidatos no está activo para este centro." },
      { status: 403 }
    );
  }

  const { data: protocols } = await supabase
    .from("protocols")
    .select("id, title, code_name, status")
    .eq("clinic_id", org.id)
    .eq("status", "active")
    .order("title");

  let protocol = null;
  if (protocolCode) {
    protocol =
      (protocols ?? []).find(
        (p) => p.code_name.toLowerCase() === protocolCode.toLowerCase()
      ) ?? null;
    if (!protocol) {
      return NextResponse.json(
        { error: "Estudio no encontrado o no activo." },
        { status: 404 }
      );
    }
  }

  return NextResponse.json({
    organization: {
      name: org.name,
      slug: org.slug,
    },
    protocol,
    protocols: (protocols ?? []).map((p) => ({
      title: p.title,
      code_name: p.code_name,
    })),
  });
}
