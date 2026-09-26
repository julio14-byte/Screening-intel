/**
 * Qué es la Versión 1 y qué queda afuera. No inventa tracción ni TrialGPT.
 */
export function ScreeningVersionNote() {
  return (
    <aside className="mb-5 rounded-xl border border-violet-100 bg-white/90 px-4 py-3 text-xs leading-relaxed text-slate-700 shadow-sm shadow-indigo-100/40 sm:text-sm">
      <p className="font-semibold text-indigo-950">
        Versión 1 — inteligencia de screening para el clinical research site
      </p>
      <p className="mt-1">
        No vendemos una base de datos de pacientes. El registro es la entrada al
        matching: cada persona que ya llegó a tu clínica es una oportunidad de
        investigación. Un screen failure no debería ser un paciente perdido.
      </p>
      <p className="mt-2 text-slate-600">
        <strong>Ya está:</strong> registro, perfil clínico, matcher, tracker y
        re-match. EDC, ePRO e IWRS los opera un tercero; no hay módulo de
        conectores en Crisvia.
      </p>
      <p className="mt-1 text-slate-600">
        <strong>Todavía no:</strong> análisis predictivo, EHR hospitalario ni
        matching multicéntrico. Un paper de TrialGPT reportó −42,6% de tiempo
        de screening en <em>su</em> evaluación; no es un número de Crisvia.
      </p>
    </aside>
  );
}
