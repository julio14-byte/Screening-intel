import { after, NextResponse } from "next/server";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { streamScreeningAgentToUI } from "@/lib/agents/screening-graph";
import {
  persistChatExchange,
  textFromUIMessage,
} from "@/lib/ai/persistConversation";
import { getUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Debes iniciar sesión para usar el asistente." },
      { status: 401 }
    );
  }

  const body = (await req.json()) as {
    messages?: UIMessage[];
    conversationId?: string;
  };

  const messages = body.messages ?? [];
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "messages debe ser un array no vacío." },
      { status: 400 }
    );
  }

  let assistantText = "";

  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: async ({ writer }) => {
      assistantText = await streamScreeningAgentToUI(messages, writer);
    },
  });

  const response = createUIMessageStreamResponse({ stream });

  after(async () => {
    try {
      const lastUser = messages[messages.length - 1];
      await persistChatExchange({
        conversationId: body.conversationId,
        userId: user.id,
        userMessage: textFromUIMessage(lastUser),
        assistantText,
      });
    } catch (err) {
      console.error("[chats] persistencia omitida:", (err as Error)?.message);
    }
  });

  return response;
}
