/**
 * Documentación pública del producto (landing + /docs).
 */
export const productDocs = {
  title: "Documentación",
  subtitle:
    "Guía rápida para coordinadores de research sites que usan Screening Intelligence.",
  sections: [
    {
      id: "inicio",
      title: "Inicio rápido",
      items: [
        {
          heading: "1. Accede a la plataforma",
          body:
            "Usa el botón Entrar en la landing o ve a /login. Tras iniciar sesión llegas al tablero central.",
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
            "Evalúa candidatos contra protocolos y sigue el estado de screening en el tablero.",
        },
      ],
    },
    {
      id: "soporte",
      title: "Soporte",
      items: [
        {
          heading: "Waitlist",
          body:
            "Si aún no tienes acceso, deja tu email en la waitlist de la landing y te avisamos.",
        },
        {
          heading: "Datos de demo",
          body:
            "En entornos de prueba puedes usar las credenciales demo mostradas en la pantalla de login.",
        },
      ],
    },
  ],
};
