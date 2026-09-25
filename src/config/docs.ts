/**
 * Documentación pública del producto (landing + /docs).
 */
export const productDocs = {
  title: "Documentación",
  subtitle:
    "Guía rápida para coordinadores de clinical research sites que usan Crisvia.",
  sections: [
    {
      id: "inicio",
      title: "Inicio rápido",
      items: [
        {
          heading: "1. Accede a la plataforma",
          body:
            "Usa el botón Entrar en la landing o ve a /login. Tras iniciar sesión llegas al Dashboard.",
        },
        {
          heading: "2. Registra pacientes",
          body:
            "Agrega candidatos con perfil clínico: condiciones, laboratorios y datos relevantes para screening.",
        },
        {
          heading: "3. Define protocolos",
          body:
            "Crea estudios con criterios de inclusión y exclusión para el motor de matching.",
        },
        {
          heading: "4. Ejecuta matching y tracking",
          body:
            "Evalúa candidatos contra protocolos y sigue el estado de screening en el Dashboard.",
        },
        {
          heading: "5. Dispensa y diario",
          body:
            "Tras IWRS, farmacia entrega la caja en /dispensacion y registra la primera dosis. El paciente usa un link /diario para hora y síntomas. No hace falta una app aparte.",
        },
        {
          heading: "6. Módulos: Screening, EDC, ePRO e IWRS",
          body:
            "La app es Screening + EDC + ePRO. El IWRS es un módulo independiente: kit y brazo se piden a /api/iwrs (documentado en /docs/api).",
        },
      ],
    },
  ],
};
