"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { PinPad } from "@/components/epro-app/PinPad";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/StateMessage";
import { readJsonResponse } from "@/lib/http/readJsonResponse";

export default function EproEntrarPage() {
  const router = useRouter();
  const codeId = useId();
  const pinId = useId();
  const [checking, setChecking] = useState(true);
  const [subjectCode, setSubjectCode] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/epro-app/p/sesion")
      .then((res) => {
        if (!cancelled && res.ok) router.replace("/epro-app");
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (!/^[0-9]{4,12}$/.test(subjectCode) || pin.length !== 6) {
      setError("Código de sujeto (4 a 12 dígitos) y PIN de 6 dígitos.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/epro-app/p/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject_code: subjectCode, pin }),
      });
      const json = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo entrar.");
      router.replace("/epro-app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar.");
      setPin("");
    } finally {
      setSaving(false);
    }
  }

  if (checking) return <LoadingState label="Revisando sesión…" />;

  return (
    <Card>
      <CardHeader
        title="Entrar al ePRO"
        description="Usá tu código de sujeto y el PIN de 6 dígitos. Esta pantalla no muestra tu nombre."
      />
      <CardBody>
        {error ? <ErrorState message={error} /> : null}
        <form onSubmit={(event) => void onSubmit(event)} className="space-y-5">
          <div>
            <label htmlFor={codeId} className="block text-sm font-medium text-indigo-950">
              Código de sujeto
            </label>
            <input
              id={codeId}
              inputMode="numeric"
              autoComplete="username"
              maxLength={12}
              value={subjectCode}
              onChange={(e) => setSubjectCode(e.target.value.replace(/\D/g, "").slice(0, 12))}
              className="mt-2 min-h-14 w-full rounded-2xl border border-violet-200 px-4 text-center text-2xl tracking-[0.25em] text-indigo-950 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-400"
              placeholder="0000"
              required
            />
          </div>
          <div>
            <p id={pinId} className="text-sm font-medium text-indigo-950">
              PIN
            </p>
            <div className="mt-2">
              <PinPad
                value={pin}
                onChange={setPin}
                labelledBy={pinId}
                disabled={saving}
                onComplete={() => void onSubmit()}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="min-h-14 w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-lg font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </CardBody>
    </Card>
  );
}
