"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileCheck, FileUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SelectInput, TextInput } from "@/components/ui/Field";
import { useProtocols } from "@/hooks/useProtocols";
import { useRole } from "@/contexts/role-context";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import type { InformedConsent } from "@/lib/types";

function todayIsoDate() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function InformedConsentPanel({ patientId }: { patientId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { protocols } = useProtocols();
  const { hasPermission, isReadOnly } = useRole();
  const canWrite = hasPermission("profiles:write") && !isReadOnly;
  const [consents, setConsents] = useState<InformedConsent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    protocolId: "",
    icfVersion: "1.0",
    consentedAt: todayIsoDate(),
    notes: "",
  });
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/consents`, {
        credentials: "include",
      });
      const data = await readJsonResponse<{
        consents?: InformedConsent[];
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo cargar el ICF.");
      setConsents(data?.consents ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar ICF.");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("protocolId", form.protocolId);
      body.append("icfVersion", form.icfVersion);
      body.append("consentedAt", form.consentedAt);
      if (form.notes) body.append("notes", form.notes);
      if (file) body.append("file", file);
      const res = await fetch(`/api/patients/${patientId}/consents`, {
        method: "POST",
        credentials: "include",
        body,
      });
      const data = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo registrar el ICF.");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleWithdraw(consentId: string) {
    if (!confirm("¿Marcar este consentimiento como retirado?")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/patients/${patientId}/consents/${consentId}`,
        { method: "PATCH", credentials: "include" }
      );
      const data = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo actualizar.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al retirar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mb-4">
      <CardHeader
        title="Consentimiento informado"
        description="Versión del ICF, fecha, quién lo tomó y PDF cifrado opcional. No cambia la elegibilidad."
        actions={<FileCheck className="h-4 w-4 text-slate-400" aria-hidden />}
      />
      <CardBody>
        {loading ? (
          <p className="text-xs text-slate-500">Cargando consentimientos…</p>
        ) : consents.length === 0 ? (
          <p className="text-xs text-slate-500">
            Todavía no hay ICF registrado para este paciente.
          </p>
        ) : (
          <ul className="mb-4 space-y-2">
            {consents.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-2 rounded-md border border-violet-100 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-slate-900">
                    {row.protocols?.code_name ?? "Protocolo"} · v{row.icf_version}
                    {row.status === "withdrawn" ? (
                      <span className="ml-2 text-xs font-normal text-rose-600">
                        retirado
                      </span>
                    ) : (
                      <span className="ml-2 text-xs font-normal text-emerald-700">
                        obtenido
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    Fecha {row.consented_at}
                    {row.notes ? ` · ${row.notes}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {row.document_id ? (
                    <a
                      className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 hover:underline"
                      href={`/api/patients/${patientId}/documents/${row.document_id}`}
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden />
                      PDF
                    </a>
                  ) : null}
                  {canWrite && row.status === "obtained" ? (
                    <Button
                      variant="ghost"
                      disabled={saving}
                      onClick={() => void handleWithdraw(row.id)}
                    >
                      Marcar retirado
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        {canWrite ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectInput
              label="Protocolo"
              value={form.protocolId}
              onChange={(e) => setForm({ ...form, protocolId: e.target.value })}
            >
              <option value="">Selecciona el estudio</option>
              {protocols.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code_name} · {p.title}
                </option>
              ))}
            </SelectInput>
            <TextInput
              label="Versión del ICF"
              value={form.icfVersion}
              onChange={(e) => setForm({ ...form, icfVersion: e.target.value })}
            />
            <TextInput
              label="Fecha de firma"
              type="date"
              value={form.consentedAt}
              onChange={(e) => setForm({ ...form, consentedAt: e.target.value })}
            />
            <TextInput
              label="Notas"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <div className="sm:col-span-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => fileRef.current?.click()}
              >
                <FileUp className="h-4 w-4" aria-hidden />
                {file ? file.name : "PDF o foto del ICF (opcional)"}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,application/pdf,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            {error ? (
              <p className="sm:col-span-2 text-xs text-rose-600" role="alert">
                {error}
              </p>
            ) : null}
            <div className="sm:col-span-2">
              <Button
                disabled={saving || !form.protocolId || !form.icfVersion}
                onClick={() => void handleSave()}
              >
                {saving ? "Guardando…" : "Registrar consentimiento"}
              </Button>
            </div>
          </div>
        ) : error && !loading ? (
          <p className="text-xs text-rose-600" role="alert">
            {error}
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}
