"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { ErrorState } from "@/components/ui/StateMessage";
import { useAuth } from "@/components/auth/AuthProvider";

type Mode = "sign_in" | "sign_up";

export default function LoginPage() {
  const router = useRouter();
  const { session, loading, configError, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) router.replace("/");
  }, [loading, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "sign_in") {
        await signIn(email, password);
        router.replace("/");
      } else {
        const needsConfirmation = await signUp(email, password);
        if (needsConfirmation) {
          setInfo(
            "Cuenta creada. Revisá tu email para confirmarla y después ingresá. " +
              "(Para pruebas, podés desactivar 'Confirm email' en Supabase → Authentication → Sign In / Providers.)"
          );
          setMode("sign_in");
        } else {
          router.replace("/");
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo iniciar sesión"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-700 text-white">
            <Activity className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="text-lg font-semibold text-slate-900">
            Screening Intelligence
          </h1>
          <p className="text-xs text-slate-500">
            Ingresá para acceder al panel de tu research site
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          {configError ? (
            <ErrorState message={configError} />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error ? <ErrorState message={error} /> : null}
              {info ? (
                <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
                  {info}
                </p>
              ) : null}

              <TextInput
                label="Email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="coordinador@clinica.com"
              />
              <TextInput
                label="Contraseña"
                type="password"
                required
                minLength={6}
                autoComplete={
                  mode === "sign_in" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                hint={mode === "sign_up" ? "Mínimo 6 caracteres" : undefined}
              />

              <Button type="submit" disabled={submitting} className="w-full justify-center">
                {mode === "sign_in" ? (
                  <LogIn className="h-4 w-4" aria-hidden />
                ) : (
                  <UserPlus className="h-4 w-4" aria-hidden />
                )}
                {submitting
                  ? "Procesando…"
                  : mode === "sign_in"
                    ? "Ingresar"
                    : "Crear cuenta"}
              </Button>
            </form>
          )}
        </div>

        {!configError ? (
          <p className="mt-4 text-center text-xs text-slate-500">
            {mode === "sign_in" ? (
              <>
                ¿No tenés cuenta?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("sign_up");
                    setError(null);
                  }}
                  className="font-medium text-sky-700 hover:text-sky-900"
                >
                  Registrate para probar
                </button>
              </>
            ) : (
              <>
                ¿Ya tenés cuenta?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("sign_in");
                    setError(null);
                  }}
                  className="font-medium text-sky-700 hover:text-sky-900"
                >
                  Ingresá
                </button>
              </>
            )}
          </p>
        ) : null}
      </div>
    </div>
  );
}
