"use client";

import Link from "next/link";
import { ClipboardList, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/StateMessage";
import { useEproForms } from "@/hooks/useEpro";

export default function EproPage() {
  const { forms, loading, error } = useEproForms();

  return (
    <>
      <PageHeader
        title="ePRO"
        description="Formularios de resultados reportados por el paciente (Fase A)."
      />

      {loading ? (
        <LoadingState label="Cargando formularios…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : forms.length === 0 ? (
        <Card>
          <EmptyState
            title="Sin formularios ePRO"
            description="Ejecutá la migración 0005_epro_phase_a.sql en Supabase para crear el formulario demo."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {forms.map((form) => (
            <Card key={form.id} className="p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                  <ClipboardList className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-slate-900">{form.title}</h2>
                  {form.description ? (
                    <p className="mt-1 text-sm text-slate-600">{form.description}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-500">
                    {form.questions.length} preguntas
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Link href={`/epro/${form.id}`}>
                  <Button>
                    <FileText className="h-4 w-4" aria-hidden />
                    Completar / ver respuestas
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
