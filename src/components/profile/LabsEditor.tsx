"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

/** Editor de resultados de laboratorio como pares nombre → valor numérico. */
export function LabsEditor({
  labs,
  onChange,
}: {
  labs: Record<string, number>;
  onChange: (labs: Record<string, number>) => void;
}) {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");

  const entries = Object.entries(labs);

  const add = () => {
    const key = name.trim().toLowerCase();
    const num = Number(value);
    if (!key || value.trim() === "" || Number.isNaN(num)) return;
    onChange({ ...labs, [key]: num });
    setName("");
    setValue("");
  };

  const remove = (key: string) => {
    const next = { ...labs };
    delete next[key];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Analito (ej: glucosa)"
          aria-label="Nombre del laboratorio"
          className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          type="number"
          step="any"
          placeholder="Valor"
          aria-label="Valor del laboratorio"
          className="w-32 shrink-0 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
        <button
          type="button"
          onClick={add}
          aria-label="Agregar laboratorio"
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Agregar
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-slate-400">
          Sin resultados de laboratorio cargados.
        </p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="py-1.5 pr-2 font-medium">Analito</th>
              <th className="py-1.5 pr-2 font-medium">Valor</th>
              <th className="py-1.5" />
            </tr>
          </thead>
          <tbody>
            {entries.map(([key, val]) => (
              <tr key={key} className="border-b border-slate-100 last:border-0">
                <td className="py-1.5 pr-2 capitalize text-slate-700">{key}</td>
                <td className="py-1.5 pr-2 tabular-nums text-slate-900">
                  {val}
                </td>
                <td className="py-1.5 text-right">
                  <button
                    type="button"
                    onClick={() => remove(key)}
                    aria-label={`Eliminar ${key}`}
                    className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
