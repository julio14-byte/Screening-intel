export type RedactionKind =
  | "correo"
  | "telefono"
  | "curp"
  | "rfc"
  | "identificador"
  | "fecha_nacimiento"
  | "direccion"
  | "nombre";

export interface RedactionResult {
  text: string;
  total: number;
  counts: Partial<Record<RedactionKind, number>>;
}

const PLACEHOLDERS: Record<RedactionKind, string> = {
  correo: "[CORREO]",
  telefono: "[TELÉFONO]",
  curp: "[CURP]",
  rfc: "[RFC]",
  identificador: "[ID]",
  fecha_nacimiento: "[FECHA NAC.]",
  direccion: "[DIRECCIÓN]",
  nombre: "[NOMBRE]",
};

const NAME_WORD = String.raw`[A-ZÁÉÍÓÚÑ][\p{L}'’-]+`;
const NAME_LINK = String.raw`(?:\s+(?:de(?:l)?|la|las|los|y)){0,2}\s+`;
const NAME_RUN = `${NAME_WORD}(?:${NAME_LINK}${NAME_WORD}){0,3}`;

const NOT_A_NAME = new Set([
  "masculino",
  "femenino",
  "hombre",
  "mujer",
  "con",
  "sin",
  "de",
  "del",
  "refiere",
  "niega",
  "acude",
  "presenta",
  "ingresa",
  "adulto",
  "adulta",
]);

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function digitCount(value: string): number {
  return value.replace(/\D/g, "").length;
}

/** Fragmentos de nombre (≥ 3 letras) que se enmascaran donde aparezcan. */
function knownNameParts(names: string[] | undefined): string[] {
  const parts = new Set<string>();
  for (const name of names ?? []) {
    for (const part of name.split(/[\s,]+/)) {
      const clean = part.trim();
      if (clean.length >= 3) parts.add(clean);
    }
  }
  return [...parts];
}

/**
 * Enmascara identificadores directos antes de enviar texto a un modelo externo.
 * Es heurístico: reduce el riesgo, no garantiza anonimato. Los valores clínicos
 * (laboratorios, fechas de diagnóstico, medicamentos) se conservan.
 */
export function redactIdentifiers(
  input: string,
  options: { names?: string[] } = {}
): RedactionResult {
  const counts: Partial<Record<RedactionKind, number>> = {};
  let text = input;

  const apply = (
    kind: RedactionKind,
    pattern: RegExp,
    replace?: (match: string, ...groups: string[]) => string | null
  ) => {
    text = text.replace(pattern, (match: string, ...rest: unknown[]) => {
      const groups = rest.filter((g): g is string => typeof g === "string");
      const replaced = replace ? replace(match, ...groups) : PLACEHOLDERS[kind];
      if (replaced === null) return match;
      counts[kind] = (counts[kind] ?? 0) + 1;
      return replaced;
    });
  };

  apply("correo", /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g);
  apply("curp", /\b[A-ZÑ]{4}\d{6}[HM][A-ZÑ]{5}[A-Z0-9]\d\b/gi);
  apply("rfc", /\b[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}\b/gi);

  apply(
    "identificador",
    /\b(NSS|IMSS|ISSSTE|expediente|folio|MRN|credencial|INE|pasaporte|n[uú]mero de (?:seguro|expediente|afiliaci[oó]n))\b([:\s#.-]*)([A-Z0-9][A-Z0-9-]{4,})/gi,
    (_m, label, sep) => `${label}${sep}${PLACEHOLDERS.identificador}`
  );

  apply(
    "fecha_nacimiento",
    /(fecha de nacimiento|f\.?\s*de\s*nac\.?|f\.?\s*nac\.?|nacid[oa] el|nac\.)(\s*[:-]?\s*)(\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{1,2} de [a-záéíóú]+ de \d{4})/gi,
    (_m, label, sep) => `${label}${sep}${PLACEHOLDERS.fecha_nacimiento}`
  );

  apply(
    "direccion",
    /\b(?:calle|avenida|av\.|blvd\.?|boulevard|calzada|colonia|col\.|privada|andador)\s+[^\n,;]{2,60}|\bC\.?P\.?\s*\d{5}\b/gi
  );

  apply(
    "telefono",
    /(?<!\d)(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,3}\)?[\s.-]?)\d{3,4}[\s.-]?\d{4}(?!\d)/g,
    (match) => (digitCount(match) >= 10 && digitCount(match) <= 13 ? PLACEHOLDERS.telefono : null)
  );

  apply(
    "nombre",
    new RegExp(
      String.raw`\b(?:Dr|Dra|Lic|Sr|Sra|Srta|Ing|Mtro|Mtra|QFB|Q\.F\.B)\.?\s+${NAME_RUN}`,
      "gu"
    )
  );

  apply(
    "nombre",
    new RegExp(
      String.raw`\b([Pp]aciente|[Nn]ombre(?: completo)?|[Mm]e llamo|[Mm]i nombre es|[Rr]esponsable|[Tt]utor(?:a)?|[Ff]amiliar)(\s*[:,-]?\s+)(${NAME_RUN})`,
      "gu"
    ),
    (_m, label, sep, name) => {
      const first = name.split(/\s+/)[0]?.toLowerCase() ?? "";
      if (NOT_A_NAME.has(first)) return null;
      return `${label}${sep}${PLACEHOLDERS.nombre}`;
    }
  );

  const parts = knownNameParts(options.names);
  if (parts.length > 0) {
    const pattern = new RegExp(
      `(?<![\\p{L}])(?:${parts.map(escapeRegex).join("|")})(?![\\p{L}])`,
      "giu"
    );
    apply("nombre", pattern);
  }

  const total = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);
  return { text, total, counts };
}
