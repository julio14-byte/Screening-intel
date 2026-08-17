"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Search, Upload, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/StateMessage";
import { ImportPatientsModal } from "@/components/patients/ImportPatientsModal";
import { NewPatientModal } from "@/components/patients/NewPatientModal";
import { usePatients } from "@/hooks/usePatients";
import { calculateAge, formatDate, GENDER_LABELS, normalizeTerm } from "@/lib/utils";

export default function PatientsPage() {
  const { patients, loading, error, addPatient, refetch } = usePatients();
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = normalizeTerm(query);
    if (!q) return patients;
    return patients.filter((p) =>
      normalizeTerm(`${p.first_name} ${p.last_name}`).includes(q)
    );
  }, [patients, query]);

  return (
    <>
      <PageHeader
        title="Patient Registry"
        description="Base de pacientes de la clínica para pre-screening."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" aria-hidden />
              Importar CSV
            </Button>
            <Button onClick={() => setModalOpen(true)}>
              <UserPlus className="h-4 w-4" aria-hidden />
              Nuevo paciente
            </Button>
          </div>
        }
      />

      <Card>
        <div className="border-b border-slate-200 p-3">
          <div className="relative max-w-sm">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o apellido…"
              aria-label="Buscar pacientes"
              className="w-full rounded-md border border-slate-300 py-1.5 pl-8 pr-3 text-sm placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        {loading ? (
          <LoadingState label="Cargando pacientes…" />
        ) : error ? (
          <div className="p-4">
            <ErrorState message={error} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={query ? "Sin resultados" : "Todavía no hay pacientes"}
            description={
              query
                ? "Probá con otro término de búsqueda."
                : "Agregá el primer paciente para comenzar el pre-screening."
            }
          />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5 font-medium">Paciente</th>
                <th className="px-4 py-2.5 font-medium">Edad</th>
                <th className="px-4 py-2.5 font-medium">Sexo</th>
                <th className="px-4 py-2.5 font-medium">Fecha de nacimiento</th>
                <th className="px-4 py-2.5 font-medium">Alta</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/patients/${p.id}`}
                      className="font-medium text-slate-900 hover:text-sky-700"
                    >
                      {p.last_name}, {p.first_name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-600">
                    {calculateAge(p.birth_date)} años
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {GENDER_LABELS[p.gender]}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {formatDate(p.birth_date)}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {formatDate(p.created_at)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/patients/${p.id}`}
                      className="inline-flex items-center gap-0.5 text-xs font-medium text-sky-700 hover:text-sky-900"
                    >
                      Perfil clínico
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <NewPatientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={addPatient}
      />

      <ImportPatientsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => void refetch()}
      />
    </>
  );
}
