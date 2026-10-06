/**
 * Screening ≠ sorteo. El matching es un filtro de criterios;
 * la randomización la hace el sponsor.
 */
export function ScreeningProcessNote({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="mb-4 rounded-md border border-violet-100 bg-violet-50/70 px-3 py-2 text-xs leading-relaxed text-indigo-800">
        <strong>No es un sorteo.</strong> El motor de reglas filtra por
        inclusión/exclusión (🟢🟡🔴). Quien cumple avanza; no “gana un cupo” al
        azar. Kit y brazo los asigna el sponsor.
      </p>
    );
  }

  return (
    <aside className="mb-4 rounded-xl border border-violet-100 bg-violet-50/70 px-3 py-2.5 text-xs leading-relaxed text-indigo-800 sm:text-sm">
      <p>
        <strong>El screening no es un sorteo digital.</strong> Versión 1:
        registro, perfil, matcher, tracker y re-match. Crisvia no elige
        pacientes al azar. El motor de reglas compara el expediente con los
        criterios del protocolo y marca 🟢 cumple, 🟡 falta un dato o 🔴 no
        cumple. La IA puede explicar el veredicto; no lo cambia.
      </p>
      <p className="mt-2">
        El coordinador marca Randomizado en el tracker cuando el sponsor ya
        asignó kit al paciente.
      </p>
    </aside>
  );
}
