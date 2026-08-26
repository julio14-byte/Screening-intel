"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { ErrorState } from "@/components/ui/StateMessage";
import { candidatoPaths } from "@/lib/candidato/paths";
import { readJsonResponse } from "@/lib/http/readJsonResponse";

export default function CandidatoHubPage() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const s = slug.trim().toLowerCase();
    if (!s) return;

    setChecking(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/candidato/config?org=${encodeURIComponent(s)}`
      );
      const data = await readJsonResponse<{ error?: string }>(res);

      if (!res.ok) {
        setError(data?.error ?? "No se encontró ese centro.");
        return;
      }

      router.push(candidatoPaths.site(s));
    } catch {
      setError("No se pudo verificar el código. Intentá de nuevo.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-indigo-950">
          Pre-registro para estudios clínicos
        </h1>
        <p className="mt-2 text-sm text-indigo-700 leading-relaxed">
          Si tu centro te envió un link, úsalo directamente. Si no, ingresa el
          código exacto del centro (el slug del link, ej.{" "}
          <code className="text-violet-700">demo</code> o{" "}
          <code className="text-violet-700">demo-a1b2c3d4</code>).
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-violet-100 bg-white p-5 shadow-sm space-y-4"
      >
        {error ? <ErrorState message={error} /> : null}
        <TextInput
          label="Código de tu centro"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="clinica-oncologia"
        />
        <Button type="submit" disabled={!slug.trim() || checking}>
          {checking ? "Verificando…" : "Continuar"}
        </Button>
      </form>

      <p className="text-xs text-indigo-500">
        Coordinadores de clinical research sites:{" "}
        <a href="/login" className="text-violet-600 underline">
          iniciar sesión aquí
        </a>
        . Activa el portal en Configuración → Portal de candidatos.
      </p>
    </div>
  );
}
