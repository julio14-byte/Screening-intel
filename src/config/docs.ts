/**
 * Documentación pública del producto (landing + /docs).
 */
export const productDocs = {
  title: "Documentación",
  subtitle:
    "Guía rápida para coordinadores de clinical research sites que usan Screenlane.",
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
            "Crea estudios con los criterios en el idioma del protocolo (inglés si el sponsor es de EUA). La app opera en español; el matching unifica sinónimos ES/EN sin traducir inclusión/exclusión.",
        },
        {
          heading: "4. Ejecuta matching y tracking",
          body:
            "Evalúa candidatos contra protocolos y sigue el estado de screening en el Dashboard.",
        },
      ],
    },
  ],
};
