"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { LabCriterion } from "@/lib/types";

/** Editor de criterios de laboratorio requeridos (nombre + rango min/max). */
export function LabCriteriaEditor({
  labs,
  onChange,
}: {
  labs: LabCriterion[];
  onChange: (labs: LabCriterion[]) => void;
}) {
  const [name, setName] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [unit, setUnit] = useState("");

  const add = () => {
    const key = name.trim().toLowerCase();
    if (!key) return;
    const minNum = min.trim() === "" ? null : Number(min);
    const maxNum = max.trim() === "" ? null : Number(max);
    if (minNum === null && maxNum === null) return;
    onChange([
      ...labs.filter((l) => l.name !== key),
      { name: key, min: minNum, max: maxNum, unit: unit.trim() || undefined },
    ]);
    setName("");
    setMin("");
    setMax("");
    setUnit("");
  };

  const inputClass =
    "rounded-md border border-slate-300 px-2.5 py-1.5 text-sm placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Analito (ej: hba1c)"
          aria-label="Analito requerido"
          className={`${inputClass} min-w-36 flex-1`}
        />
        <input
          value={min}
          onChange={(e) => setMin(e.target.value)}
          type="number"
          step="any"
          placeholder="Mín"
          aria-label="Valor mínimo"
          className={`${inputClass} w-20`}
        />
        <input
          value={max}
          onChange={(e) => setMax(e.target.value)}
          type="number"
          step="any"
          placeholder="Máx"
          aria-label="Valor máximo"
          className={`${inputClass} w-20`}
        />
        <input
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="Unidad"
          aria-label="Unidad"
          className={`${inputClass} w-24`}
        />
        <button
          type="button"
          onClick={add}
          aria-label="Agregar criterio de laboratorio"
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Agregar
        </button>
      </div>

      {labs.length === 0 ? (
        <p className="text-xs text-slate-400">
          Sin criterios de laboratorio. Cargá al menos mín o máx.
        </p>
      ) : (
        <ul className="space-y-1">
          {labs.map((lab) => (
            <li
              key={lab.name}
              className="flex items-center justify-between rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700"
            >
              <span>
                <span className="font-medium capitalize">{lab.name}</span>
                {lab.min != null ? ` · mín ${lab.min}` : ""}
                {lab.max != null ? ` · máx ${lab.max}` : ""}
                {lab.unit ? ` ${lab.unit}` : ""}
              </span>
              <button
                type="button"
                onClick={() => onChange(labs.filter((l) => l.name !== lab.name))}
                aria-label={`Quitar ${lab.name}`}
                className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
