"use client";

import { cn } from "@/lib/utils";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { useId } from "react";

const inputClasses =
  "w-full rounded-md border border-violet-200 bg-white px-2.5 py-1.5 text-sm text-indigo-950 " +
  "placeholder:text-violet-300 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500";

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={htmlFor}
        className="block text-xs font-medium text-slate-700"
      >
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export function TextInput({ label, hint, className, id, ...props }: TextInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const input = (
    <input id={inputId} className={cn(inputClasses, className)} {...props} />
  );
  if (!label) return input;
  return (
    <Field label={label} hint={hint} htmlFor={inputId}>
      {input}
    </Field>
  );
}

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
}

export function SelectInput({
  label,
  hint,
  className,
  id,
  children,
  ...props
}: SelectInputProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const select = (
    <select id={selectId} className={cn(inputClasses, className)} {...props}>
      {children}
    </select>
  );
  if (!label) return select;
  return (
    <Field label={label} hint={hint} htmlFor={selectId}>
      {select}
    </Field>
  );
}
