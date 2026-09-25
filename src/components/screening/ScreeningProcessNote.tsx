/**
 * Screening ≠ sorteo. El matching es un filtro de criterios;
 * la randomización (IWRS) es el paso aleatorio posterior.
 */
export function ScreeningProcessNote({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="mb-4 rounded-md border border-violet-100 bg-violet-50/70 px-3 py-2 text-xs leading-relaxed text-indigo-800">
        <strong>No es un sorteo.</strong> El motor de reglas filtra por
        inclusión/exclusión (🟢🟡🔴). Quien cumple avanza a visitas; no “gana un
        cupo” al azar. El azar controlado es IWRS (/iwrs): kit y brazo después
        del screening.
      </p>
    );
  }

  return (
    <aside className="mb-4 rounded-xl border border-violet-100 bg-violet-50/70 px-3 py-2.5 text-xs leading-relaxed text-indigo-800 sm:text-sm">
      <p>
        <strong>El screening no es un sorteo digital.</strong> Crisvia no elige
        pacientes al azar. El motor de reglas compara el expediente (edad, sexo
        biológico, diagnósticos, medicación, labs) con los criterios del
        protocolo y marca 🟢 cumple, 🟡 falta un dato o 🔴 no cumple. La IA
        puede explicar el veredicto; no lo cambia.
      </p>
      <p className="mt-2">
        El paso que sí se parece a un sorteo controlado es la{" "}
        <strong>randomización IWRS</strong> en{" "}
        <a href="/iwrs" className="font-medium text-violet-700 underline">
          /iwrs
        </a>
        : asigna kit y brazo cuando el paciente ya está en Screening. No decide
        quién entra al estudio.
      </p>
    </aside>
  );
}
