/**
 * PostgREST devuelve un embed 1:1 (unique FK) como objeto, no como array.
 * Sin este unwrap, `clinical_profiles?.[0]` queda siempre null y el matcher
 * muestra "Sin perfil clínico" aunque el expediente exista.
 */
export function firstEmbedded<T extends object>(
  value: T | T[] | null | undefined
): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}
