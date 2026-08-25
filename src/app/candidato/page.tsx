"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { candidatoPaths } from "@/lib/candidato/paths";

export default function CandidatoHubPage() {
  const router = useRouter();
  const [slug, setSlug] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-indigo-950">Pre-registro para estudios clínicos</h1>
        <p className="mt-2 text-sm text-indigo-700 leading-relaxed">
          Si tu centro de investigación te envió un link, úsalo directamente. Si no,
          ingresa el código de tu centro abajo.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const s = slug.trim().toLowerCase();
          if (s) router.push(candidatoPaths.site(s));
        }}
        className="rounded-xl border border-violet-100 bg-white p-5 shadow-sm space-y-4"
      >
        <TextInput
          label="Código de tu centro"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="clinica-oncologia"
        />
        <Button type="submit" disabled={!slug.trim()}>
          Continuar
        </Button>
      </form>

      <p className="text-xs text-indigo-500">
        Coordinadores de research sites:{" "}
        <a href="/login" className="text-violet-600 underline">iniciar sesión aquí</a>.
      </p>
    </div>
  );
}
