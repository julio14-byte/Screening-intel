"use client";

import { useState } from "react";
import { Loader2, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  conditionsToText,
  formatIcd11Condition,
  parseConditionsText,
  type Icd11SearchResult,
} from "@/lib/icd11/utils";
import { cn } from "@/lib/utils";

export function ConditionsEditor({
  conditions,
  onChange,
}: {
  conditions: string[];
  onChange: (conditions: string[]) => void;
}) {
  const [text, setText] = useState(() => conditionsToText(conditions));
  const [lookup, setLookup] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<Icd11SearchResult[]>([]);

  function updateText(value: string) {
    setText(value);
    onChange(parseConditionsText(value));
  }

  function appendCondition(line: string) {
    const next = text.trim() ? `${text.trim()}\n${line}` : line;
    updateText(next);
    setResults([]);
  }

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

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo consultar ICD-11.");
      }

      setResults(data.results ?? []);
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : "Error al buscar en ICD-11."
      );
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-3">
      <label htmlFor="conditions-text" className="sr-only">
        Condiciones médicas en texto libre
      </label>
      <textarea
        id="conditions-text"
        rows={6}
        value={text}
        onChange={(event) => updateText(event.target.value)}
        placeholder={
          "Escribí patologías y diagnósticos activos en texto libre.\n" +
          "Una condición por línea. Ej:\n" +
          "Diabetes mellitus tipo 2\n" +
          "Hipertensión esencial"
        }
        className="w-full resize-y rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm leading-relaxed text-indigo-950 placeholder:text-violet-300 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
      />
      <p className="text-[11px] text-indigo-500">
        Texto libre compatible con ICD-11. Podés escribir a mano o buscar
        diagnósticos oficiales abajo.
      </p>

      <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 to-violet-50/50 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-indigo-800">
          <Sparkles className="h-3.5 w-3.5 text-violet-500" aria-hidden />
          Buscar en ICD-11 (OMS)
        </div>
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
            placeholder="ej: diabetes tipo 2"
            aria-label="Buscar término en ICD-11"
            className="min-w-0 flex-1 rounded-md border border-violet-200 px-2.5 py-1.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => void searchIcd11()}
            disabled={searching || !lookup.trim()}
          >
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Search className="h-4 w-4" aria-hidden />
            )}
            Buscar
          </Button>
        </div>

        {searchError ? (
          <p className="mt-2 text-xs text-rose-600">{searchError}</p>
        ) : null}

        {results.length > 0 ? (
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
            {results.slice(0, 8).map((result) => {
              const line = formatIcd11Condition(result);
              return (
                <li key={result.id}>
                  <button
                    type="button"
                    onClick={() => appendCondition(line)}
                    className={cn(
                      "w-full rounded-md border border-violet-100 bg-white px-2.5 py-1.5 text-left text-xs",
                      "text-indigo-900 transition-colors hover:border-violet-300 hover:bg-violet-50"
                    )}
                  >
                    {line}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
