"use client";

import { EPRO_PIN_LENGTH } from "@/lib/epro-app/constants";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "borrar", "0", "ok"] as const;

export function PinPad({
  value,
  onChange,
  onComplete,
  disabled,
  labelledBy,
}: {
  value: string;
  onChange: (next: string) => void;
  onComplete?: (pin: string) => void;
  disabled?: boolean;
  labelledBy?: string;
}) {
  function press(key: (typeof KEYS)[number]) {
    if (disabled) return;
    if (key === "borrar") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === "ok") {
      if (value.length === EPRO_PIN_LENGTH) onComplete?.(value);
      return;
    }
    if (value.length >= EPRO_PIN_LENGTH) return;
    onChange(`${value}${key}`);
  }

  return (
    <div className="space-y-4">
      <p
        className="flex justify-center gap-2"
        aria-live="polite"
        aria-labelledby={labelledBy}
      >
        {Array.from({ length: EPRO_PIN_LENGTH }).map((_, index) => (
          <span
            key={index}
            className={`h-4 w-4 rounded-full border-2 ${
              index < value.length
                ? "border-violet-600 bg-violet-600"
                : "border-violet-300 bg-white"
            }`}
            aria-hidden
          />
        ))}
        <span className="sr-only">{value.length} de 6 dígitos</span>
      </p>
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => press(key)}
            className="min-h-14 rounded-2xl border border-violet-200 bg-white text-xl font-semibold text-indigo-950 shadow-sm hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:opacity-50"
          >
            {key === "borrar" ? "←" : key === "ok" ? "OK" : key}
          </button>
        ))}
      </div>
    </div>
  );
}
