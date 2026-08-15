import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Guarda el último intercambio usuario ↔ asistente (best-effort).
 */
export async function persistChatExchange(input: {
  conversationId?: string | null;
  userId: string;
  userMessage: string;
  assistantText: string;
}): Promise<string | null> {
  const trimmedUser = input.userMessage?.trim();
  if (!trimmedUser) return null;

  const supabase = await createClient();

  let convId = input.conversationId;
  if (!convId) {
    const { data, error } = await supabase
      .from("ai_conversations")
      .insert({ user_id: input.userId })
      .select("id")
      .single();
    if (error || !data) {
      console.error("[ai] crear conversación:", error?.message);
      return null;
    }
    convId = data.id;
  }

  const rows: { conversation_id: string; role: string; content: string }[] = [
    { conversation_id: convId, role: "user", content: trimmedUser },
  ];

  const trimmedAssistant = input.assistantText?.trim();
  if (trimmedAssistant) {
    rows.push({
      conversation_id: convId,
      role: "assistant",
      content: trimmedAssistant,
    });
  }

  const { error: insertError } = await supabase.from("ai_messages").insert(rows);
  if (insertError) {
    console.error("[ai] insertar mensajes:", insertError.message);
  }

  return convId;
}

export function textFromUIMessage(
  message: { parts?: Array<{ type: string; text?: string }> } | undefined
): string {
  if (!message?.parts) return "";
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join("");
}
