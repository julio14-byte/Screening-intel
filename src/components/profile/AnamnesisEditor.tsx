"use client";

import { Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, SelectInput, TextArea, TextInput } from "@/components/ui/Field";
import { formatIcd11Condition, type Icd11SearchResult } from "@/lib/icd11/utils";
import {
  ALLERGY_CATEGORIES,
  ALLERGY_CATEGORY_LABEL,
  DIAGNOSIS_SEVERITIES,
  DIAGNOSIS_SEVERITY_LABEL,
  emptyAllergy,
  emptyDiagnosis,
  emptyMedication,
  MEDICATION_KIND_LABEL,
  MEDICATION_KINDS,
  MEDICATION_STATUS_LABEL,
  MEDICATION_STATUSES,
  type ClinicalAnamnesis,
} from "@/lib/profile/anamnesis";

export function AnamnesisEditor({
  value,
  onChange,
}: {
  value: ClinicalAnamnesis;
  onChange: (next: ClinicalAnamnesis) => void;
}) {
  const [lookup, setLookup] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<Icd11SearchResult[]>([]);

  async function searchIcd11() {
    const query = lookup.trim();
    if (!query) return;
    setSearching(true);
    setSearchError(null);
    setResults([]);
    try {
      const response = await fetch(
        `/api/icd11/search?q=${encodeURIComponent(query)}`
      );
      const data = (await response.json()) as {
        results?: Icd11SearchResult[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "No se pudo consultar ICD-11.");
      setResults(data.results ?? []);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Error ICD-11.");
    } finally {
      setSearching(false);
    }
  }

  function addDiagnosis(name = "") {
    onChange({ ...value, diagnoses: [...value.diagnoses, emptyDiagnosis(name)] });
    setResults([]);
    setLookup("");
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-indigo-950">
              Diagnósticos y enfermedades crónicas
            </h3>
            <p className="text-xs text-slate-500">
              Fecha exacta, síntomas actuales, gravedad y evolución. El matching
              usa el nombre del diagnóstico.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={() => addDiagnosis()}>
            <Plus className="h-4 w-4" aria-hidden />
            Agregar diagnóstico
          </Button>
        </div>

        <div className="mb-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
          <p className="mb-2 text-xs font-medium text-indigo-800">
            Buscar en ICD-11 (OMS) y agregar al historial
          </p>
          <div className="flex gap-2">
            <input
              value={lookup}
              onChange={(event) => setLookup(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void searchIcd11();
                }
              }}
              placeholder="ej: diabetes tipo 2, asma, hipertensión"
              aria-label="Buscar término en ICD-11"
              className="min-w-0 flex-1 rounded-md border border-violet-200 px-2.5 py-1.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => void searchIcd11()}
              disabled={searching || !lookup.trim()}
            >
              <Search className="h-4 w-4" aria-hidden />
              Buscar
            </Button>
          </div>
          {searchError ? (
            <p className="mt-2 text-xs text-rose-600">{searchError}</p>
          ) : null}
          {results.length > 0 ? (
            <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto">
              {results.slice(0, 8).map((result) => {
                const line = formatIcd11Condition(result);
                return (
                  <li key={result.id}>
                    <button
                      type="button"
                      onClick={() => addDiagnosis(line)}
                      className="w-full rounded-md border border-violet-100 bg-white px-2.5 py-1.5 text-left text-xs text-indigo-900 hover:bg-violet-50"
                    >
                      {line}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        {value.diagnoses.length === 0 ? (
          <p className="text-xs text-slate-400">
            Sin diagnósticos. Agregá hipertensión, diabetes, asma u otra patología.
          </p>
        ) : (
          <div className="space-y-3">
            {value.diagnoses.map((row, index) => (
              <article
                key={row.id}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"
              >
                <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_10rem_9rem_auto]">
                  <TextInput
                    label="Diagnóstico"
                    value={row.name}
                    onChange={(event) => {
                      const diagnoses = value.diagnoses.map((item, i) =>
                        i === index ? { ...item, name: event.target.value } : item
                      );
                      onChange({ ...value, diagnoses });
                    }}
                    placeholder="ej: diabetes tipo 2"
                  />
                  <Field label="Fecha del diagnóstico" htmlFor={`dx-date-${row.id}`}>
                    <input
                      id={`dx-date-${row.id}`}
                      type="date"
                      value={row.diagnosed_at}
                      onChange={(event) => {
                        const diagnoses = value.diagnoses.map((item, i) =>
                          i === index
                            ? { ...item, diagnosed_at: event.target.value }
                            : item
                        );
                        onChange({ ...value, diagnoses });
                      }}
                      className="w-full rounded-md border border-violet-200 bg-white px-2.5 py-1.5 text-sm"
                    />
                  </Field>
                  <SelectInput
                    label="Gravedad"
                    value={row.severity}
                    onChange={(event) => {
                      const diagnoses = value.diagnoses.map((item, i) =>
                        i === index
                          ? {
                              ...item,
                              severity: event.target.value as typeof row.severity,
                            }
                          : item
                      );
                      onChange({ ...value, diagnoses });
                    }}
                  >
                    <option value="">Sin dato</option>
                    {DIAGNOSIS_SEVERITIES.map((severity) => (
                      <option key={severity} value={severity}>
                        {DIAGNOSIS_SEVERITY_LABEL[severity]}
                      </option>
                    ))}
                  </SelectInput>
                  <button
                    type="button"
                    className="mt-6 self-start rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label="Quitar diagnóstico"
                    onClick={() =>
                      onChange({
                        ...value,
                        diagnoses: value.diagnoses.filter((_, i) => i !== index),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  <TextArea
                    label="Síntomas actuales"
                    rows={3}
                    value={row.symptoms}
                    onChange={(event) => {
                      const diagnoses = value.diagnoses.map((item, i) =>
                        i === index ? { ...item, symptoms: event.target.value } : item
                      );
                      onChange({ ...value, diagnoses });
                    }}
                    placeholder="Qué presenta hoy"
                  />
                  <TextArea
                    label="Evolución"
                    rows={3}
                    value={row.evolution}
                    onChange={(event) => {
                      const diagnoses = value.diagnoses.map((item, i) =>
                        i === index
                          ? { ...item, evolution: event.target.value }
                          : item
                      );
                      onChange({ ...value, diagnoses });
                    }}
                    placeholder="Cómo ha evolucionado desde el diagnóstico"
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <TextArea
          label="Cirugías previas"
          hint="Procedimientos, año aproximado y secuelas si las hay"
          rows={4}
          value={value.surgeries}
          onChange={(event) =>
            onChange({ ...value, surgeries: event.target.value })
          }
          placeholder="ej: colecistectomía 2019"
        />
        <TextArea
          label="Hospitalizaciones"
          hint="Motivo, fecha y duración"
          rows={4}
          value={value.hospitalizations}
          onChange={(event) =>
            onChange({ ...value, hospitalizations: event.target.value })
          }
          placeholder="ej: internación por cetoacidosis, 2024"
        />
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-indigo-950">
              Historial de medicamentos
            </h3>
            <p className="text-xs text-slate-500">
              Fármacos, vitaminas, suplementos o herbolarios. Dosis y horario.
              Actuales o de los últimos meses.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              onChange({
                ...value,
                medications: [...value.medications, emptyMedication()],
              })
            }
          >
            <Plus className="h-4 w-4" aria-hidden />
            Agregar fármaco
          </Button>
        </div>
        {value.medications.length === 0 ? (
          <p className="text-xs text-slate-400">Sin medicación registrada.</p>
        ) : (
          <div className="space-y-3">
            {value.medications.map((row, index) => (
              <article
                key={row.id}
                className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-6"
              >
                <div className="lg:col-span-2">
                  <TextInput
                    label="Nombre"
                    value={row.name}
                    onChange={(event) => {
                      const medications = value.medications.map((item, i) =>
                        i === index ? { ...item, name: event.target.value } : item
                      );
                      onChange({ ...value, medications });
                    }}
                    placeholder="ej: metformina"
                  />
                </div>
                <SelectInput
                  label="Tipo"
                  value={row.kind}
                  onChange={(event) => {
                    const medications = value.medications.map((item, i) =>
                      i === index
                        ? { ...item, kind: event.target.value as typeof row.kind }
                        : item
                    );
                    onChange({ ...value, medications });
                  }}
                >
                  {MEDICATION_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {MEDICATION_KIND_LABEL[kind]}
                    </option>
                  ))}
                </SelectInput>
                <SelectInput
                  label="Uso"
                  value={row.status}
                  onChange={(event) => {
                    const medications = value.medications.map((item, i) =>
                      i === index
                        ? {
                            ...item,
                            status: event.target.value as typeof row.status,
                          }
                        : item
                    );
                    onChange({ ...value, medications });
                  }}
                >
                  {MEDICATION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {MEDICATION_STATUS_LABEL[status]}
                    </option>
                  ))}
                </SelectInput>
                <TextInput
                  label="Dosis"
                  value={row.dose}
                  onChange={(event) => {
                    const medications = value.medications.map((item, i) =>
                      i === index ? { ...item, dose: event.target.value } : item
                    );
                    onChange({ ...value, medications });
                  }}
                  placeholder="850 mg"
                />
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <TextInput
                      label="Horario"
                      value={row.schedule}
                      onChange={(event) => {
                        const medications = value.medications.map((item, i) =>
                          i === index
                            ? { ...item, schedule: event.target.value }
                            : item
                        );
                        onChange({ ...value, medications });
                      }}
                      placeholder="8:00 y 20:00"
                    />
                  </div>
                  <button
                    type="button"
                    className="mb-0.5 rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label="Quitar medicamento"
                    onClick={() =>
                      onChange({
                        ...value,
                        medications: value.medications.filter((_, i) => i !== index),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-indigo-950">Alergias</h3>
            <p className="text-xs text-slate-500">
              Medicamentos, alimentos o sustancias químicas. Anotá la reacción.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              onChange({
                ...value,
                allergies: [...value.allergies, emptyAllergy()],
              })
            }
          >
            <Plus className="h-4 w-4" aria-hidden />
            Agregar alergia
          </Button>
        </div>
        {value.allergies.length === 0 ? (
          <p className="text-xs text-slate-400">Sin alergias conocidas.</p>
        ) : (
          <div className="space-y-3">
            {value.allergies.map((row, index) => (
              <article
                key={row.id}
                className="grid gap-3 rounded-xl border border-amber-100 bg-amber-50/40 p-3 sm:grid-cols-[1fr_11rem_1fr_auto]"
              >
                <TextInput
                  label="Sustancia"
                  value={row.substance}
                  onChange={(event) => {
                    const allergies = value.allergies.map((item, i) =>
                      i === index
                        ? { ...item, substance: event.target.value }
                        : item
                    );
                    onChange({ ...value, allergies });
                  }}
                  placeholder="ej: penicilina"
                />
                <SelectInput
                  label="Tipo"
                  value={row.category}
                  onChange={(event) => {
                    const allergies = value.allergies.map((item, i) =>
                      i === index
                        ? {
                            ...item,
                            category: event.target.value as typeof row.category,
                          }
                        : item
                    );
                    onChange({ ...value, allergies });
                  }}
                >
                  {ALLERGY_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {ALLERGY_CATEGORY_LABEL[category]}
                    </option>
                  ))}
                </SelectInput>
                <TextInput
                  label="Reacción"
                  value={row.reaction}
                  onChange={(event) => {
                    const allergies = value.allergies.map((item, i) =>
                      i === index
                        ? { ...item, reaction: event.target.value }
                        : item
                    );
                    onChange({ ...value, allergies });
                  }}
                  placeholder="ej: rash, anafilaxia"
                />
                <button
                  type="button"
                  className="mt-6 self-start rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  aria-label="Quitar alergia"
                  onClick={() =>
                    onChange({
                      ...value,
                      allergies: value.allergies.filter((_, i) => i !== index),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
