import {
  AIMessage,
  AIMessageChunk,
  HumanMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import type { UIMessage } from "ai";

export function uiMessagesToLangChain(messages: UIMessage[]): BaseMessage[] {
  const result: BaseMessage[] = [];

  for (const message of messages) {
    const text = message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("");

    if (!text.trim()) continue;

    if (message.role === "user") {
      result.push(new HumanMessage(text));
      continue;
    }

    if (message.role === "assistant") {
      result.push(new AIMessage(text));
    }
  }

  return result;
}

export function extractTextFromLangChainMessage(message: BaseMessage): string {
  if (typeof message.content === "string") {
    return message.content;
  }

  if (Array.isArray(message.content)) {
    return message.content
      .map((part) => {
        if (typeof part === "string") return part;
        if ("text" in part && typeof part.text === "string") return part.text;
        return "";
      })
      .join("");
  }

  return "";
}

export function isAssistantStreamChunk(message: BaseMessage): boolean {
  return (
    AIMessageChunk.isInstance(message) ||
    AIMessage.isInstance(message) ||
    message._getType() === "ai"
  );
}
