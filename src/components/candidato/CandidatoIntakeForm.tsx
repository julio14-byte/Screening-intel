"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { SelectInput, TextInput } from "@/components/ui/Field";
import { ErrorState } from "@/components/ui/StateMessage";
import { candidatoPaths } from "@/lib/candidato/paths";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import type { Gender } from "@/lib/types";

type PortalConfig = {
  organization: { name: string; slug: string };
  protocol?: { title: string; code_name: string } | null;
};

export function CandidatoIntakeForm({
  orgSlug,
  protocolCode,
  config,
}: {
  orgSlug: string;
  protocolCode?: string;
  config: PortalConfig;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    birth_date: "",
    gender: "female" as Gender,
    conditionsText: "",
    medicationsText: "",
    raw_notes: "",
    contact_email: "",
    contact_phone: "",
    consent: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseList = (text: string) =>
    text
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.consent) {
      setError("Debes aceptar el aviso para continuar.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/candidato/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgSlug,
          protocolCode,
          first_name: form.first_name,
          last_name: form.last_name,
          birth_date: form.birth_date,
          gender: form.gender,
          conditions: parseList(form.conditionsText),
          medications: parseList(form.medicationsText),
          raw_notes: form.raw_notes || undefined,
          contact_email: form.contact_email || undefined,
          contact_phone: form.contact_phone || undefined,
          consent: true,
        }),
      });

      const data = await readJsonResponse<{
        error?: string;
        referralCode?: string;
        graciasUrl?: string;
      }>(res);

      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudo enviar.");
      }

      if (!data?.referralCode && !data?.graciasUrl) {
        throw new Error("Respuesta inválida del servidor.");
      }

      router.push(
        data.graciasUrl ?? candidatoPaths.gracias(data.referralCode ?? "")
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-violet-100 bg-violet-50/80 p-4 text-sm text-indigo-900">
        <p className="font-medium">{config.organization.name}</p>
        {config.protocol ? (
          <p className="mt-1 text-indigo-700">
            Estudio: {config.protocol.title} ({config.protocol.code_name})
          </p>
        ) : (
          <p className="mt-1 text-indigo-700">
            Pre-registro para estudios activos del centro.
          </p>
        )}
        <p className="mt-2 text-xs text-indigo-600">
          Esto no es un diagnóstico. Un coordinador revisará tu caso y te
          contactará.
        </p>
      </div>

      {error ? <ErrorState message={error} /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput
          label="Nombre"
          required
          value={form.first_name}
          onChange={(e) => setForm({ ...form, first_name: e.target.value })}
        />
        <TextInput
          label="Apellido"
          required
          value={form.last_name}
          onChange={(e) => setForm({ ...form, last_name: e.target.value })}
        />
        <TextInput
          label="Fecha de nacimiento"
          type="date"
          required
          value={form.birth_date}
          onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
        />
        <SelectInput
          label="Sexo"
          value={form.gender}
          onChange={(e) =>
            setForm({ ...form, gender: e.target.value as Gender })
          }
        >
          <option value="female">Femenino</option>
          <option value="male">Masculino</option>
          <option value="other">Otro</option>
        </SelectInput>
      </div>

      <TextInput
        label="Condiciones o diagnósticos (separados por coma)"
        value={form.conditionsText}
        onChange={(e) => setForm({ ...form, conditionsText: e.target.value })}
        placeholder="diabetes tipo 2, hipertensión"
      />
      <TextInput
        label="Medicación actual (separada por coma)"
        value={form.medicationsText}
        onChange={(e) => setForm({ ...form, medicationsText: e.target.value })}
        placeholder="metformina, enalapril"
      />
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-indigo-900">
          ¿Algo más que debamos saber? (opcional)
        </span>
        <textarea
          className="w-full rounded-lg border border-violet-200 px-3 py-2 text-sm text-indigo-950 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
          rows={4}
          value={form.raw_notes}
          onChange={(e) => setForm({ ...form, raw_notes: e.target.value })}
          placeholder="Cuéntanos brevemente tu situación de salud…"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput
          label="Email"
          type="email"
          value={form.contact_email}
          onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
        />
        <TextInput
          label="Teléfono"
          type="tel"
          value={form.contact_phone}
          onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
        />
      </div>

      <label className="flex items-start gap-2 text-sm text-indigo-800">
        <input
          type="checkbox"
          className="mt-1 rounded border-violet-300"
          checked={form.consent}
          onChange={(e) => setForm({ ...form, consent: e.target.checked })}
        />
        <span>
          Entiendo que esto es una pre-evaluación orientativa, no una decisión
          médica. Acepto que el centro me contacte con los datos proporcionados.
        </span>
      </label>

      <Button type="submit" disabled={saving} className="w-full sm:w-auto">
        {saving ? "Enviando…" : "Enviar pre-registro"}
      </Button>
    </form>
  );
}
