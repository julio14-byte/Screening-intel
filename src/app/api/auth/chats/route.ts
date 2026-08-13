import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { streamScreeningAgentToUI } from "@/lib/agents/screening-graph";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: UIMessage[] };

  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: async ({ writer }) => {
      await streamScreeningAgentToUI(messages, writer);
    },
  });

  return createUIMessageStreamResponse({ stream });
}
