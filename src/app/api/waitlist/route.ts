import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/security/rate-limit";
import { readJsonBody, serverError } from "@/lib/security/http";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  source: z.string().trim().max(60).optional(),
});

/** Insert público en waitlist (anon). */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "La lista de espera no está disponible por ahora." },
      { status: 503 }
    );
  }

  const limited = await rateLimit(`waitlist:ip:${clientIp(request)}`, 5, 3600);
  if (!limited.allowed) return tooManyRequests(limited);

  const parsedBody = await readJsonBody(request, 4_000);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = bodySchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { error } = await supabase.from("waitlist").insert({
    email: parsed.data.email,
    source: parsed.data.source || "landing",
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: true });
    }
    return serverError("waitlist", error, "No se pudo registrar tu correo.");
  }

  return NextResponse.json({ ok: true });
}
