"use client";

import { FormEvent, use, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { PinPad } from "@/components/epro-app/PinPad";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/StateMessage";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import { EPRO_PIN_LENGTH } from "@/lib/epro-app/constants";

export default function EproActivarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const yearId = useId();
  const pinId = useId();
  const confirmId = useId();
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [birthYear, setBirthYear] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/epro-app/p/activar?token=${encodeURIComponent(token)}`)
      .then((res) =>
        readJsonResponse<{ error?: string }>(res).then((json) => ({ res, json }))
      )
      .then(({ res, json }) => {
        if (cancelled) return;
        if (!res.ok) throw new Error(json?.error ?? "Link inválido.");
      })
      .catch((err) => {
        if (!cancelled) {
          setInvalid(err instanceof Error ? err.message : "Link inválido.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (!/^\d{4}$/.test(birthYear)) {
      setError("Ingresá tu año de nacimiento (4 dígitos).");
      return;
    }
    if (pin.length !== EPRO_PIN_LENGTH || pin !== confirm) {
      setError("El PIN de 6 dígitos debe coincidir en ambos campos.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/epro-app/p/activar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, birth_year: birthYear, pin }),
      });
      const json = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo activar.");
      router.replace("/epro-app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo activar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Validando invitación…" />;

  if (invalid) {
    return (
      <Card>
        <CardHeader
          title="Invitación no válida"
          description={invalid}
        />
        <CardBody>
          <p className="text-sm text-slate-600">
            Pedile un link nuevo al coordinador. El enlace dura 48 horas y se usa una sola vez.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Activá tu ePRO"
        description="Confirmá tu identidad con el año de nacimiento y creá un PIN de 6 dígitos. No mostramos tu nombre."
      />
      <CardBody>
        {error ? <ErrorState message={error} /> : null}
        <form onSubmit={(event) => void onSubmit(event)} className="space-y-5">
          <div>
            <label htmlFor={yearId} className="block text-sm font-medium text-indigo-950">
              Año de nacimiento
            </label>
            <input
              id={yearId}
              inputMode="numeric"
              autoComplete="bday-year"
              maxLength={4}
              pattern="\d{4}"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="mt-2 min-h-14 w-full rounded-2xl border border-violet-200 px-4 text-center text-2xl tracking-[0.4em] text-indigo-950 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-400"
              placeholder="AAAA"
              required
            />
          </div>
          <div>
            <p id={pinId} className="text-sm font-medium text-indigo-950">
              PIN de 6 dígitos
            </p>
            <div className="mt-2">
              <PinPad value={pin} onChange={setPin} labelledBy={pinId} disabled={saving} />
            </div>
          </div>
          <div>
            <p id={confirmId} className="text-sm font-medium text-indigo-950">
              Repetí el PIN
            </p>
            <div className="mt-2">
              <PinPad
                value={confirm}
                onChange={setConfirm}
                labelledBy={confirmId}
                disabled={saving}
                onComplete={() => void onSubmit()}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="min-h-14 w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-lg font-semibold text-white shadow-sm disabled:opacity-50"
          >
            {saving ? "Activando…" : "Activar y continuar"}
          </button>
        </form>
      </CardBody>
    </Card>
  );
}
