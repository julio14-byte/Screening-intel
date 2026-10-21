"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea, TextInput } from "@/components/ui/Field";
import { ErrorState } from "@/components/ui/StateMessage";
import { toErrorMessage } from "@/lib/errors";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import {
  emptySiteProfile,
  type SiteProfile,
  type SiteProfileField,
} from "@/lib/site/profile";

type Response = { profile?: SiteProfile; error?: string };

export function SiteProfilePanel() {
  const [form, setForm] = useState<SiteProfile>(emptySiteProfile());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings/site");
        const json = await readJsonResponse<Response>(res);
        if (!res.ok) throw new Error(json?.error ?? "No se pudo cargar.");
        if (json?.profile) setForm(json.profile);
      } catch (e) {
        setError(toErrorMessage(e, "No se pudo cargar."));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const bind = (field: SiteProfileField) => ({
    value: form[field],
    onChange: (e: { target: { value: string } }) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value })),
  });

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/site", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await readJsonResponse<Response>(res);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo guardar.");
      if (json?.profile) setForm(json.profile);
      setMessage("Datos del centro guardados.");
    } catch (e) {
      setError(toErrorMessage(e, "No se pudo guardar."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-indigo-600">Cargando…</p>;

  return (
    <div className="space-y-6">
      {error ? <ErrorState message={error} /> : null}
      {message ? (
        <p className="text-sm font-medium text-emerald-700">{message}</p>
      ) : null}

      <section className="rounded-xl border border-violet-100 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-indigo-950">Identidad</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextInput label="Nombre del centro" maxLength={160} {...bind("site_name")} />
          <TextInput label="Razón social" maxLength={200} {...bind("legal_name")} />
          <TextInput label="Dirección" maxLength={300} {...bind("address")} />
          <TextInput label="Ciudad" maxLength={100} {...bind("city")} />
          <TextInput label="Estado" maxLength={100} {...bind("state")} />
          <TextInput label="País" maxLength={100} {...bind("country")} />
        </div>
      </section>

      <section className="rounded-xl border border-violet-100 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-indigo-950">Equipo y contacto</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextInput label="Investigador principal" maxLength={160} {...bind("pi_name")} />
          <TextInput label="Cédula profesional" maxLength={60} {...bind("pi_license")} />
          <TextInput label="Contacto para patrocinadores" maxLength={160} {...bind("contact_name")} />
          <TextInput label="Correo de contacto" type="email" maxLength={320} {...bind("contact_email")} />
          <TextInput label="Teléfono de contacto" type="tel" maxLength={40} {...bind("contact_phone")} />
        </div>
      </section>

      <section className="rounded-xl border border-violet-100 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-indigo-950">Capacidades</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextInput label="Comité de ética en investigación" maxLength={200} {...bind("ethics_committee")} />
          <TextInput label="Registro CONBIOÉTICA" maxLength={80} {...bind("ethics_registration")} />
        </div>
        <div className="mt-4 space-y-4">
          <TextInput label="Áreas terapéuticas" maxLength={400} {...bind("therapeutic_areas")} />
          <TextArea label="Infraestructura y equipo" maxLength={1000} {...bind("facilities")} />
        </div>
      </section>

      <Button type="button" onClick={save} disabled={saving}>
        {saving ? "Guardando…" : "Guardar"}
      </Button>
    </div>
  );
}
