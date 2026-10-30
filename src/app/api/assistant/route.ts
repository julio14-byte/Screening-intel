import { NextResponse } from "next/server";
import { z } from "zod";
import { runScreeningAssistant } from "@/lib/ai/assistant";
import { opsContext } from "@/lib/ops/http";

const bodySchema = z.object({
  timeZone: z.string().trim().min(1).max(80).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000),
      })
    )
    .min(1)
    .max(12),
});

export async function POST(request: Request) {
  const gate = await opsContext(false);
  if (!gate.ok) return gate.response;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "La consulta no es válida." }, { status: 400 });
  }
  if (parsed.data.messages.at(-1)?.role !== "user") {
    return NextResponse.json({ error: "La consulta tiene que terminar en una pregunta." }, { status: 400 });
  }

  try {
    const reply = await runScreeningAssistant({
      supabase: gate.supabase,
      organizationId: gate.organizationId,
      messages: parsed.data.messages,
      now: new Date(),
      timeZone: parsed.data.timeZone ?? "America/Mexico_City",
    });
    return NextResponse.json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("OPENAI_API_KEY")) {
      return NextResponse.json(
        { error: "El asistente no tiene configurada la clave de OpenAI." },
        { status: 503 }
      );
    }
    console.error("[assistant]", message.slice(0, 200));
    return NextResponse.json(
      { error: "No se pudo consultar el asistente." },
      { status: 502 }
    );
  }
}
