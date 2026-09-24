"use client";

import { Activity, Ruler, TestTubes } from "lucide-react";
import type { Gender } from "@/lib/types";
import {
  fieldsInGroup,
  hasPregnancyResult,
  PREGNANCY_LABEL,
  withComputedBmi,
  type MeasurementField,
} from "@/lib/profile/clinical-measurements";
import { Field } from "@/components/ui/Field";

function inputClass() {
  return (
    "w-full rounded-md border border-violet-200 bg-white px-2.5 py-1.5 text-sm text-indigo-950 " +
    "placeholder:text-violet-300 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
  );
}

function NumberField({
  field,
  value,
  onChange,
  readOnly,
}: {
  field: MeasurementField;
  value: number | undefined;
  onChange: (raw: string) => void;
  readOnly?: boolean;
}) {
  const id = `m-${field.key}`;
  return (
    <Field
      label={`${field.label}${field.unit ? ` (${field.unit})` : ""}`}
      hint={field.hint}
      htmlFor={id}
    >
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={field.step ?? "any"}
        min={field.min}
        max={field.max}
        value={value ?? ""}
        readOnly={readOnly}
        disabled={readOnly}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass()}
        placeholder={readOnly ? "—" : "—"}
      />
    </Field>
  );
}

export function ClinicalMeasurementsEditor({
  labs,
  gender,
  onChange,
}: {
  labs: Record<string, number>;
  gender: Gender;
  onChange: (labs: Record<string, number>) => void;
}) {
  function setNumeric(key: string, raw: string) {
    const next = { ...labs };
    if (raw.trim() === "") {
      delete next[key];
    } else {
      const num = Number(raw);
      if (!Number.isFinite(num)) return;
      next[key] = num;
    }
    onChange(withComputedBmi(next));
  }

  const pregnancyNeeded = gender !== "male";
  const pregnancyMissing = pregnancyNeeded && !hasPregnancyResult(labs);

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-indigo-950">
          <Activity className="h-4 w-4 text-slate-400" aria-hidden />
          Signos vitales
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fieldsInGroup("vitals").map((field) => (
            <NumberField
              key={field.key}
              field={field}
              value={labs[field.key]}
              onChange={(raw) => setNumeric(field.key, raw)}
            />
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-indigo-950">
          <Ruler className="h-4 w-4 text-slate-400" aria-hidden />
          Antropometría
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {fieldsInGroup("anthropometry").map((field) => (
            <NumberField
              key={field.key}
              field={field}
              value={labs[field.key]}
              readOnly={field.computed}
              onChange={(raw) => setNumeric(field.key, raw)}
            />
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-indigo-950">
          <TestTubes className="h-4 w-4 text-slate-400" aria-hidden />
          Laboratorio dirigido
        </h3>
        <p className="mb-3 text-xs text-slate-500">
          Glucosa, función renal, enzimas hepáticas y hemograma. El matching usa
          estos nombres de analito.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fieldsInGroup("labs").map((field) => (
            <NumberField
              key={field.key}
              field={field}
              value={labs[field.key]}
              onChange={(raw) => setNumeric(field.key, raw)}
            />
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-indigo-950">
          Prueba de embarazo
        </h3>
        <p className="mb-3 text-xs text-slate-500">
          Obligatoria en sangre u orina cuando hay potencial de gestación. En
          matching, 0 = negativo y 1 = positivo.
        </p>
        {pregnancyMissing ? (
          <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Falta la prueba de embarazo (sangre u orina). Cargala antes de
            screening si el protocolo la exige.
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          {fieldsInGroup("pregnancy").map((field) => {
            const id = `m-${field.key}`;
            const current = labs[field.key];
            const selectValue =
              current === 0 || current === 1 ? String(current) : "";
            return (
              <Field
                key={field.key}
                label={field.label}
                hint={field.hint}
                htmlFor={id}
              >
                <select
                  id={id}
                  value={selectValue}
                  onChange={(event) => setNumeric(field.key, event.target.value)}
                  className={inputClass()}
                >
                  <option value="">No realizada</option>
                  <option value="0">{PREGNANCY_LABEL[0]}</option>
                  <option value="1">{PREGNANCY_LABEL[1]}</option>
                </select>
              </Field>
            );
          })}
        </div>
      </section>
    </div>
  );
}
