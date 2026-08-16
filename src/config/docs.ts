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
          heading: "1. Crea tu cuenta",
          body:
            "Usa el botón Entrar en la landing o ve a /login. Tras iniciar sesión llegas al tablero central (/dashboard).",
        },
        {
          heading: "2. Registra pacientes",
          body:
            "En Patient Registry (/patients) agrega candidatos con perfil clínico: condiciones, laboratorios y tags.",
        },
        {
          heading: "3. Define protocolos",
          body:
            "En Protocol Matcher (/protocols) crea estudios con criterios de inclusión y exclusión.",
        },
        {
          heading: "4. Ejecuta matching",
          body:
            "Abre un protocolo → Match para ver candidatos con score y veredicto automático.",
        },
        {
          heading: "5. Trackea screening",
          body:
            "Screening Tracker (/tracker) muestra un Kanban: pre-screening, screening, randomizado o screen failure.",
        },
      ],
    },
    {
      id: "modulos",
      title: "Módulos de la app",
      items: [
        {
          heading: "Tablero central",
          body:
            "Métricas del embudo, actividad reciente y KPIs de producto (waitlist, signups, chat IA).",
        },
        {
          heading: "Re-Match",
          body:
            "Re-evalúa cohortes cuando cambian criterios o se activa un protocolo nuevo (/rematch).",
        },
        {
          heading: "Asistente IA",
          body:
            "Chat clínico con contexto de pacientes y protocolos (/chat). Las conversaciones se guardan para métricas.",
        },
        {
          heading: "ICD-11",
          body:
            "Normalización y búsqueda de códigos vía API interna para perfiles clínicos.",
        },
      ],
    },
    {
      id: "planes",
      title: "Planes y suscripción",
      items: [
        {
          heading: "Starter (trial)",
          body:
            "14 días gratis: hasta 50 pacientes, 3 protocolos activos, 1 usuario. Sin tarjeta para empezar.",
        },
        {
          heading: "Site Pro",
          body:
            "Suscripción mensual vía Stripe ($149/mes): 500 pacientes, 50 protocolos, re-match e asistente IA.",
        },
        {
          heading: "Gestionar plan",
          body:
            "Usuarios autenticados: Configuración (/settings) para ver plan activo, upgradear o abrir el portal Stripe.",
        },
      ],
    },
    {
      id: "stripe",
      title: "Pagos con Stripe",
      items: [
        {
          heading: "Checkout",
          body:
            "Desde la landing o Configuración, el plan Pro abre Stripe Checkout. Tras pagar, el webhook actualiza tu organización.",
        },
        {
          heading: "Variables de entorno",
          body:
            "STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID_PRO y NEXT_PUBLIC_APP_URL en .env.local.",
        },
        {
          heading: "Portal de cliente",
          body:
            "Desde Configuración puedes cancelar o cambiar método de pago en el portal hospedado por Stripe.",
        },
      ],
    },
  ],
};
