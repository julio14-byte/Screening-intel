"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { getSupabaseClient } from "@/lib/supabase/client";

type TotpFactor = {
  id: string;
  status: "verified" | "unverified";
  friendly_name?: string;
};

export function SecurityMfaPanel({ forceEnroll = false }: { forceEnroll?: boolean }) {
  const router = useRouter();
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const verified = factors.filter((f) => f.status === "verified");
  const needsEnroll = forceEnroll || verified.length === 0;

  const refreshFactors = useCallback(async () => {
    const supabase = getSupabaseClient();
    const { data, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) throw listError;
    setFactors(
      data.totp.map((f) => ({
        id: f.id,
        status: f.status,
        friendly_name: f.friendly_name,
      }))
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        await refreshFactors();
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron listar los factores MFA."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshFactors]);

  async function startEnroll() {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const supabase = getSupabaseClient();
      const { data: listed } = await supabase.auth.mfa.listFactors();
      const leftover =
        listed?.all.filter(
          (f) => f.factor_type === "totp" && f.status === "unverified"
        ) ?? [];
      for (const factor of leftover) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Screenlane",
      });
      if (enrollError || !data || data.type !== "totp") {
        setError(
          enrollError?.message ??
            "No se pudo iniciar el alta de MFA. Habilitá TOTP en Supabase → Authentication → MFA."
        );
        return;
      }
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enrolar MFA.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyEnroll(event: FormEvent) {
    event.preventDefault();
    if (!factorId) return;
    setError(null);
    setBusy(true);
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
      setQrCode(null);
      setSecret(null);
      setFactorId(null);
      setCode("");
      setInfo("MFA activado. Ya podés usar la app con el código de tu autenticador.");
      await refreshFactors();
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo verificar el código.");
    } finally {
      setBusy(false);
    }
  }

  async function unenroll(id: string) {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const supabase = getSupabaseClient();
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId: id,
      });
      if (unenrollError) {
        setError(unenrollError.message);
        return;
      }
      setInfo("Factor TOTP eliminado.");
      await refreshFactors();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo quitar MFA.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-indigo-600">Cargando factores MFA…</p>;
  }

  return (
    <div className="max-w-xl space-y-5 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
          <KeyRound className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-indigo-950">
            Autenticación de dos factores (TOTP)
          </h2>
          <p className="mt-1 text-sm text-indigo-600">
            Investigator y sub-investigator deben confirmar un código de
            autenticador (Authy, 1Password, Google Authenticator) en cada
            inicio de sesión en producción.
          </p>
        </div>
      </div>

      {needsEnroll && verified.length === 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Tu rol clínico requiere MFA. Escaneá el QR y confirmá un código para
          continuar.
        </p>
      ) : null}

      {verified.length > 0 ? (
        <ul className="space-y-2">
          {verified.map((factor) => (
            <li
              key={factor.id}
              className="flex items-center justify-between rounded-lg border border-violet-100 bg-violet-50/60 px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2 text-indigo-900">
                <ShieldCheck className="h-4 w-4 text-violet-600" aria-hidden />
                {factor.friendly_name || "Autenticador TOTP"} — activo
              </span>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => void unenroll(factor.id)}
              >
                Quitar
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {qrCode ? (
        <form onSubmit={verifyEnroll} className="space-y-3">
          {/* QR is a data:image/svg+xml URI from Supabase; next/image does not apply. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrCode}
            alt="Código QR para enrolar TOTP"
            className="mx-auto h-48 w-48 rounded-lg border border-violet-100 bg-white p-2"
          />
          {secret ? (
            <p className="break-all text-center text-xs text-indigo-500">
              Clave manual: <code className="font-mono">{secret}</code>
            </p>
          ) : null}
          <TextInput
            label="Código de 6 dígitos"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            required
          />
          <Button type="submit" disabled={busy || code.length !== 6}>
            {busy ? "Verificando…" : "Activar MFA"}
          </Button>
        </form>
      ) : (
        <Button onClick={() => void startEnroll()} disabled={busy}>
          {verified.length > 0 ? "Agregar otro autenticador" : "Activar TOTP"}
        </Button>
      )}

      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {info ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {info}
        </p>
      ) : null}
    </div>
  );
}
