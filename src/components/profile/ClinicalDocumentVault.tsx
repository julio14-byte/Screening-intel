"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileUp, Lock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { useRole } from "@/contexts/role-context";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import type { ClinicalDocument } from "@/lib/types";

const KIND_LABEL: Record<ClinicalDocument["kind"], string> = {
  lab_pdf: "PDF de laboratorio",
  prescription_photo: "Foto de receta",
  informed_consent: "Consentimiento informado",
  other: "Otro",
};

function encryptionLabel(value: ClinicalDocument["encryption"]) {
  return value === "aes-256-gcm"
    ? "AES-256-GCM"
    : "cifrado en reposo (Storage)";
}

export function ClinicalDocumentVault({ patientId }: { patientId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { hasPermission, isReadOnly } = useRole();
  const canWrite = hasPermission("profiles:write") && !isReadOnly;
  const [documents, setDocuments] = useState<ClinicalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/documents`, {
        credentials: "include",
      });
      const data = await readJsonResponse<{
        documents?: ClinicalDocument[];
        error?: string;
      }>(res);
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudieron cargar los documentos.");
      }
      setDocuments(data?.documents ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar documentos.");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  async function handleUpload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/patients/${patientId}/documents`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudo guardar el documento.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload(doc: ClinicalDocument) {
    setError(null);
    const res = await fetch(
      `/api/patients/${patientId}/documents/${doc.id}`,
      { credentials: "include" }
    );
    if (!res.ok) {
      const data = await readJsonResponse<{ error?: string }>(res);
      setError(data?.error ?? "No se pudo descargar.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.original_filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete(doc: ClinicalDocument) {
    if (!confirm("¿Borrar este documento del expediente?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/patients/${patientId}/documents/${doc.id}`,
        { method: "DELETE", credentials: "include" }
      );
      const data = await readJsonResponse<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudo borrar.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al borrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mb-4">
      <CardHeader
        title="Documentos del expediente"
        description="Archivo original cifrado (AES o Storage). No extrae labs: para pre-rellenar el perfil usa el bloque de arriba."
        actions={<Lock className="h-4 w-4 text-slate-400" aria-hidden />}
      />
      <CardBody>
        {canWrite ? (
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              <FileUp className="h-4 w-4" aria-hidden />
              {busy ? "Guardando…" : "Subir PDF o foto"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void handleUpload(file);
              }}
            />
          </>
        ) : null}

        {loading ? (
          <p className="mt-3 text-xs text-slate-500">Cargando documentos…</p>
        ) : documents.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500">
            Todavía no hay fuentes adjuntas. El perfil estructurado (labs /
            medicación) se guarda aparte.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">
                    {doc.original_filename}
                  </p>
                  <p className="text-xs text-slate-500">
                    {KIND_LABEL[doc.kind]} · {encryptionLabel(doc.encryption)} ·{" "}
                    {new Date(doc.created_at).toLocaleString("es")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void handleDownload(doc)}
                    disabled={busy}
                  >
                    <Download className="h-4 w-4" aria-hidden />
                    Descargar
                  </Button>
                  {canWrite ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => void handleDelete(doc)}
                      disabled={busy}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                      Borrar
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        {error ? (
          <p className="mt-2 text-xs text-rose-600" role="alert">
            {error}
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}
