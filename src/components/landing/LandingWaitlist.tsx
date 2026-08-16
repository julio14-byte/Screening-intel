"use client";

import { FormEvent, useState } from "react";
import { Mail, Send } from "lucide-react";
import config from "@/config";
import { routes } from "@/lib/app/routes";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import { Button } from "@/components/ui/Button";

export function LandingWaitlist() {
  const { eyebrow, title, subtitle, buttonLabel, placeholder, successMessage } =
    config.landing.waitlist;

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);

    try {
      const res = await fetch(routes.apis.waitlist, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "landing" }),
      });

      const data = await readJsonResponse<{ error?: string }>(res);

      if (!res.ok) {
        setStatus("error");
        setMessage(
          data?.error ?? `No se pudo registrar el email (${res.status}).`
        );
        return;
      }

      setStatus("success");
      setMessage(successMessage);
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Error de conexión. Intentá de nuevo.");
    }
  }

  return (
    <section
      id="waitlist"
      className="scroll-mt-14 border-t border-white/10 px-4 py-12 sm:scroll-mt-16 sm:px-6 sm:py-16 lg:py-20"
    >
      <div className="mx-auto max-w-xl text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-400 sm:text-xs">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl lg:text-3xl">
          {title}
        </h2>
        <p className="mt-3 text-sm text-violet-200 sm:text-base">{subtitle}</p>

        {status === "success" ? (
          <div
            role="status"
            className="mx-auto mt-6 max-w-md rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-5 text-sm text-emerald-300 sm:mt-8 sm:py-6"
          >
            {message}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-3 sm:mt-8">
            <div className="flex flex-col gap-3">
              <div className="relative w-full">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-400"
                  aria-hidden
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={placeholder}
                  required
                  disabled={status === "loading"}
                  className="w-full min-h-[44px] rounded-lg border border-white/20 bg-white/10 py-2.5 pl-10 pr-3 text-base text-white placeholder:text-violet-300/60 focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 sm:text-sm"
                />
              </div>
              <Button
                type="submit"
                disabled={status === "loading"}
                className="w-full justify-center min-h-[44px] px-5 py-2.5 sm:w-auto"
              >
                <Send className="h-4 w-4" aria-hidden />
                {status === "loading" ? "Enviando…" : buttonLabel}
              </Button>
            </div>
            {status === "error" && message ? (
              <p role="alert" className="text-sm text-rose-300">{message}</p>
            ) : null}
          </form>
        )}
      </div>
    </section>
  );
}
