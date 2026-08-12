import type { Gender, ScreeningStatus } from "./types";

/** Edad en años cumplidos a partir de una fecha ISO (YYYY-MM-DD). */
export function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate + "T00:00:00");
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export const GENDER_LABELS: Record<Gender, string> = {
  male: "Masculino",
  female: "Femenino",
  other: "Otro",
};

export const SCREENING_STATUS_LABELS: Record<ScreeningStatus, string> = {
  pre_screening: "Pre-screening",
  screening: "Screening",
  randomized: "Randomizado",
  screen_failure: "Screen Failure",
};

export const SCREENING_STATUS_ORDER: ScreeningStatus[] = [
  "pre_screening",
  "screening",
  "randomized",
  "screen_failure",
];

/** Normaliza texto libre para comparaciones (minúsculas, sin tildes). */
export function normalizeTerm(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
