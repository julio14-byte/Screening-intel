"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import config from "@/config";
import { routes } from "@/lib/app/routes";
import { getSupabaseClient } from "@/lib/supabase/client";

export function MfaChallengeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFactor() {
      try {
        const supabase = getSupabaseClient();
        const { data, error: listError } = await supabase.auth.mfa.listFactors();
        if (listError) {
          if (!cancelled) setError(listError.message);
          return;
        }
        const verified = data.totp[0];
        if (!verified) {
          router.replace(`${routes.app.security}?enroll=1`);
          return;
        }
        if (!cancelled) {
          setFactorId(verified.id);
          setReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "No se pudo preparar MFA."
          );
        }
      }
    }

    void loadFactor();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!factorId) return;
    setError(null);
    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: code.trim(),
      });
      if (verifyError) {
        setError(verifyError.message);
        return;
      }
      router.replace(routes.afterLogin);
      router.refresh();
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-950 via-violet-900 to-fuchsia-900 px-4 py-10">
      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 text-white shadow-lg shadow-violet-500/30">
            <ShieldCheck className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Verificación MFA
          </h1>
          <p className="mt-1 text-sm text-violet-200">
            Ingresá el código de 6 dígitos de tu autenticador para {config.app.name}.
          </p>
        </div>

        <div className="rounded-2xl border border-white/15 bg-white/95 p-6 shadow-2xl shadow-indigo-950/40 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <TextInput
              label="Código TOTP"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              required
              disabled={!ready || loading}
            />

            {error ? (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={!ready || loading || code.length !== 6}
              className="w-full justify-center py-2.5"
            >
              {loading ? "Verificando…" : "Continuar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
