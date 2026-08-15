"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { Activity, Lock, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { DEFAULT_DEMO_EMAIL, DEFAULT_DEMO_PASSWORD } from "@/lib/auth/constants";
import { routes } from "@/lib/app/routes";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(DEFAULT_DEMO_EMAIL);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(routes.apis.authLogin, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error ?? "No se pudo iniciar sesión.");
        return;
      }

      const fromParam = searchParams.get("from");
      const from =
        fromParam && fromParam.startsWith("/") && !fromParam.startsWith("//")
          ? fromParam
          : routes.afterLogin;
      router.replace(from);
      router.refresh();
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-950 via-violet-900 to-fuchsia-900 px-4 py-10">
      <div
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-fuchsia-400/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-56 w-56 -translate-x-1/2 rounded-full bg-amber-300/10 blur-3xl"
        aria-hidden
      />

      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 text-white shadow-lg shadow-violet-500/30">
            <Activity className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Screening Intelligence
          </h1>
          <p className="mt-1 text-sm text-violet-200">
            Acceso de prueba para el equipo de research
          </p>
        </div>

        <div className="rounded-2xl border border-white/15 bg-white/95 p-6 shadow-2xl shadow-indigo-950/40 backdrop-blur-sm">
          <div className="mb-5 flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-50 to-violet-50 px-3 py-2 text-xs text-indigo-800">
            <Sparkles className="h-4 w-4 shrink-0 text-violet-500" aria-hidden />
            <span>
              Demo: <strong>{DEFAULT_DEMO_EMAIL}</strong> /{" "}
              <strong>{DEFAULT_DEMO_PASSWORD}</strong>
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <TextInput
              label="Correo"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="demo@screening.local"
              required
              className="border-violet-200 focus:border-violet-500 focus:ring-violet-500"
            />

            <div className="relative">
              <TextInput
                label="Contraseña"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="border-violet-200 pr-10 focus:border-violet-500 focus:ring-violet-500"
              />
              <Lock
                className="pointer-events-none absolute right-2.5 top-[1.85rem] h-4 w-4 text-violet-400"
                aria-hidden
              />
            </div>

            {error ? (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={loading}
              className="w-full justify-center py-2.5"
            >
              <Mail className="h-4 w-4" aria-hidden />
              {loading ? "Ingresando…" : "Iniciar sesión"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
