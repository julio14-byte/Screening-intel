"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolName, isToolUIPart, type UIMessage } from "ai";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Loader2,
  SendHorizontal,
  Sparkles,
  Square,
  User,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";

const SUGGESTED_PROMPTS = [
  "Convertí 'presión alta' a terminología ICD-11",
  "¿Qué pacientes tenemos con diabetes?",
  "Normalizá 'azúcar alta' según ICD-11",
  "Muéstrame los screen failures para re-match",
];

const TOOL_LABELS: Record<string, string> = {
  search_patients: "Buscando pacientes (MCP)",
  match_protocol: "Evaluando protocolo (MCP)",
  list_screen_failures: "Consultando screen failures (MCP)",
  icd11_normalize_colloquial: "Normalizando a terminología ICD-11",
  icd11_search: "Buscando en ICD-11 (MCP)",
  icd11_get_entity: "Consultando detalle ICD-11 (MCP)",
  searchPatientsByCriteria: "Buscando pacientes en la base",
  matchPatientsToProtocol: "Evaluando elegibilidad del protocolo",
  getScreenFailuresForRematch: "Consultando screen failures",
};

function getTextFromMessage(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const text = getTextFromMessage(message);
  const toolParts = message.parts.filter(isToolUIPart);

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white"
            : "bg-gradient-to-br from-cyan-400 to-violet-500 text-white"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" aria-hidden />
        ) : (
          <Bot className="h-4 w-4" aria-hidden />
        )}
      </div>

      <div
        className={cn(
          "max-w-[85%] space-y-2",
          isUser ? "items-end text-right" : "items-start"
        )}
      >
        {toolParts.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {toolParts.map((part) => {
              const toolName = getToolName(part);
              const label = TOOL_LABELS[toolName] ?? `Ejecutando ${toolName}`;
              const done = part.state === "output-available";
              const failed = part.state === "output-error";

              return (
                <span
                  key={part.toolCallId}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                    failed
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : done
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                  )}
                >
                  {!done && !failed ? (
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  ) : (
                    <Wrench className="h-3 w-3" aria-hidden />
                  )}
                  {label}
                </span>
              );
            })}
          </div>
        ) : null}

        {text ? (
          <div
            className={cn(
              "rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
              isUser
                ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
                : "border border-violet-100 bg-white text-indigo-950 shadow-sm"
            )}
          >
            {text}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ClinicalChat() {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/auth/chats" }),
    []
  );

  const { messages, sendMessage, status, error, stop } = useChat({ transport });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, status]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isBusy) return;

    setInput("");
    await sendMessage({ text });
  }

  async function handleSuggestion(prompt: string) {
    if (isBusy) return;
    await sendMessage({ text: prompt });
  }

  return (
    <>
      <PageHeader
        title="Asistente Clínico"
        description="LangGraph acoplado a MCP: screening-intel + ICD-11 como servidores de herramientas."
      />

      <Card className="flex min-h-[calc(100vh-11rem)] flex-col overflow-hidden">
        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-indigo-50/40 to-white p-4"
        >
          {messages.length === 0 ? (
            <div className="flex h-full min-h-64 flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 text-white shadow-lg shadow-violet-300/40">
                <Sparkles className="h-7 w-7" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-medium text-indigo-900">
                  ¿En qué te puedo ayudar hoy?
                </p>
                <p className="mt-1 max-w-md text-xs text-indigo-600/70">
                  Escribí en lenguaje coloquial (ej. &quot;presión alta&quot;) y te lo
                  convierto a terminología ICD-11, o preguntame por pacientes y protocolos.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleSuggestion(prompt)}
                    className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs text-indigo-800 transition-colors hover:border-violet-300 hover:bg-violet-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}

          {isBusy && messages.length > 0 ? (
            <div className="flex items-center gap-2 text-xs text-violet-600">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              El asistente está pensando…
            </div>
          ) : null}
        </div>

        <CardBody className="border-t border-violet-100 bg-white p-4">
          {error ? (
            <p className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error.message}
            </p>
          ) : null}

          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <label htmlFor="chat-input" className="sr-only">
              Escribí tu mensaje
            </label>
            <textarea
              id="chat-input"
              rows={2}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSubmit(event);
                }
              }}
              placeholder="Ej: convertí 'azúcar alta' a terminología ICD-11"
              disabled={isBusy}
              className="min-h-[3rem] flex-1 resize-none rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-indigo-950 placeholder:text-violet-300 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-60"
            />
            {isBusy ? (
              <Button type="button" variant="secondary" onClick={stop}>
                <Square className="h-4 w-4" aria-hidden />
                Detener
              </Button>
            ) : (
              <Button type="submit" disabled={!input.trim()}>
                <SendHorizontal className="h-4 w-4" aria-hidden />
                Enviar
              </Button>
            )}
          </form>
        </CardBody>
      </Card>
    </>
  );
}
