/**
 * Screening ≠ sorteo. El matching es un filtro de criterios;
 * la randomización la hace el IWRS del tercero.
 */
export function ScreeningProcessNote({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="mb-4 rounded-md border border-violet-100 bg-violet-50/70 px-3 py-2 text-xs leading-relaxed text-indigo-800">
        <strong>No es un sorteo.</strong> El motor de reglas filtra por
        inclusión/exclusión (🟢🟡🔴). Quien cumple avanza; no “gana un cupo” al
        azar. Kit y brazo los asigna el IWRS del sponsor, conectado en /integraciones.
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
        EDC, ePRO e IWRS los opera un <strong>tercero</strong>. Cuando el
        candidato queda elegible, Crisvia avisa por webhook. El IRT del estudio
        confirma la randomización hacia Crisvia. Se configura en{" "}
        <a href="/integraciones" className="font-medium text-violet-700 underline">
          /integraciones
        </a>
        . No hay enchufe a Lilly ni a Medidata.
      </p>
    </aside>
  );
}
