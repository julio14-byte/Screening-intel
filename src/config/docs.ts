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
            "Crea estudios con criterios de inclusión y exclusión para el motor de matching.",
        },
        {
          heading: "4. Ejecuta matching y tracking",
          body:
            "Evalúa candidatos contra protocolos y sigue el estado de screening en el Dashboard.",
        },
      ],
    },
    {
      id: "privacidad",
      title: "Privacidad y regulaciones",
      items: [
        {
          heading: "Datos por centro",
          body:
            "Cada clinical research site es una organización. RLS y RBAC evitan que un equipo vea pacientes de otro. El portal público no expone secretos del centro.",
        },
        {
          heading: "IA sin decidir elegibilidad",
          body:
            "El motor de reglas define cumple / pendiente / no cumple. La IA explica el veredicto con iniciales, extrae criterios o notas, y no debe recibir el nombre completo.",
        },
        {
          heading: "Marcos de referencia",
          body:
            "Bitácora orientada a 21 CFR Part 11 e ICH-GCP. Controles alineados a HIPAA, GDPR y leyes de datos de LatAm. Screenlane no emite la certificación de tu site. Ver /privacidad.",
        },
      ],
    },
    {
      id: "integraciones",
      title: "ETL e integraciones",
      items: [
        {
          heading: "ETL clínico",
          body:
            "Extract (CSV, portal, EHR, PDF de laboratorio, foto de receta) → Transform (perfil, ICD-11, reglas) → Load (pacientes, screenings, re-match). No hace falta EHR para el MVP.",
        },
        {
          heading: "PDF de laboratorio y foto de receta",
          body:
            "En /patients/[id] sube un PDF digital o fotografía la receta. La IA pre-rellena el perfil; revisas y guardas. Un PDF escaneado sin texto se fotografía. POST /api/patients/profile/extract-document.",
        },
        {
          heading: "EHR batch y webhook",
          body:
            "POST /api/ehr/sync (sesión) y POST /api/webhooks/ehr (HMAC). Upsert por ehr_patient_id. Configura en /settings/ehr. Detalle en /integraciones.",
        },
        {
          heading: "API",
          body:
            "OpenAPI y Swagger en /docs/api. Stripe, ICD-11 y webhooks EHR están documentados ahí.",
        },
      ],
    },
  ],
};
