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
          heading: "5. Conectá EDC, ePRO e IWRS de terceros",
          body:
            "En /integraciones cargás la URL HTTPS y el secreto HMAC de cada módulo. Cuando el screening queda elegible, Crisvia avisa al proveedor. El IWRS del sponsor confirma randomización en POST /api/integraciones/inbound. No hay enchufe a Lilly ni a Medidata.",
        },
      ],
    },
  ],
};
