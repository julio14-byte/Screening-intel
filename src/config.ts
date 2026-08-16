/**
 * Config central del producto.
 * Cambiar branding, copy, features y pricing aquí altera el producto sin abrir JSX.
 */
const config = {
  app: {
    name: "Screening Intelligence",
    description:
      "Pre-screening y re-matching de pacientes para protocolos de investigación clínica.",
    domain: "screening-intel.vercel.app",
    locale: "es",
    defaultUrl: "http://localhost:3000",
    nav: [
      {
        href: "/dashboard",
        label: "Tablero Central",
        icon: "LayoutDashboard",
      },
      {
        href: "/patients",
        label: "Patient Registry",
        icon: "Users",
      },
      {
        href: "/protocols",
        label: "Protocol Matcher",
        icon: "FlaskConical",
      },
      {
        href: "/tracker",
        label: "Screening Tracker",
        icon: "KanbanSquare",
      },
      {
        href: "/rematch",
        label: "Re-Match & Follow-up",
        icon: "RefreshCw",
      },
      {
        href: "/chat",
        label: "Asistente IA",
        icon: "MessageSquare",
        feature: "aiChat" as const,
      },
      {
        href: "/settings",
        label: "Configuración",
        icon: "Settings",
        feature: "payments" as const,
      },
    ],
  },

  brand: {
    primary: "#7c3aed",
    logoText: "Screening Intelligence",
    logoSrc: null as string | null,
    radius: "0.75rem",
  },

  features: {
    waitlist: true,
    emailLogin: true,
    aiChat: true,
    pricing: true,
    payments: true,
  },

  productMetrics: {
    enabled: true,
    founderEmails: [] as string[],
  },

  /** URLs canónicas — middleware, nav y landing leen desde aquí. */
  routes: {
    landing: "/",
    login: "/login",
    afterLogin: "/dashboard",
    protected: [
      "/dashboard",
      "/patients",
      "/protocols",
      "/tracker",
      "/rematch",
      "/chat",
      "/account",
      "/settings",
      "/semaforos",
      "/devices",
    ],
    publicApis: [
      "/api/auth/login",
      "/api/waitlist",
      "/api/webhooks/stripe",
    ],
    app: {
      dashboard: "/dashboard",
      patients: "/patients",
      protocols: "/protocols",
      semaforos: "/semaforos",
      devices: "/devices",
      tracker: "/tracker",
      rematch: "/rematch",
      chat: "/chat",
      billing: "/account/billing",
      settings: "/settings",
      docs: "/docs",
    },
    apis: {
      waitlist: "/api/waitlist",
      authLogin: "/api/auth/login",
      authLogout: "/api/auth/logout",
      authSession: "/api/auth/session",
      authChats: "/api/auth/chats",
      stripeCheckout: "/api/stripe/checkout",
      stripePortal: "/api/stripe/portal",
      stripeWebhook: "/api/webhooks/stripe",
      icd11Search: "/api/icd11/search",
      icd11Normalize: "/api/icd11/normalize",
    },
  },

  auth: {
    loginUrl: "/login",
    afterLoginUrl: "/dashboard",
    afterLogoutUrl: "/login",
    landingUrl: "/",
  },

  landing: {
    nav: [
      { label: "Documentación", href: "#docs" },
      { label: "Precios", href: "#pricing" },
      { label: "Waitlist", href: "#waitlist" },
      { label: "Entrar", href: "#entrar" },
    ],
    hero: {
      eyebrow: "Research sites · Pre-screening clínico",
      title: "Encuentra candidatos al protocolo correcto, más rápido.",
      subtitle:
        "Pre-screening y re-matching de pacientes para protocolos de investigación clínica.",
    },
    enterApp: {
      eyebrow: "Acceso",
      title: "¿Listo para usar la app?",
      subtitle:
        "Inicia sesión con tu cuenta y entra al tablero central de tu research site.",
    },
    problem: {
      eyebrow: "El problema",
      title: "El pre-screening manual no escala.",
      subtitle:
        "Coordinadores de estudios pierden horas en hojas de cálculo, emails y notas dispersas antes de incluir un paciente.",
      items: [
        {
          icon: "Timer",
          title: "Screening lento",
          body: "Revisar criterios uno por uno contra cada paciente consume días del equipo de research.",
        },
        {
          icon: "FileSpreadsheet",
          title: "Datos fragmentados",
          body: "Pacientes en Excel, protocolos en PDF y estados de screening en otro lugar — sin una fuente de verdad.",
        },
        {
          icon: "UserX",
          title: "Candidatos perdidos",
          body: "Sin re-matching, pacientes que podrían calificar para un nuevo protocolo nunca se re-evalúan.",
        },
      ],
    },
    features: {
      eyebrow: "Plataforma",
      title: "Todo el funnel de screening en un solo lugar.",
      subtitle:
        "Diseñado para coordinadores de research sites con protocolos activos y cohortes en crecimiento.",
      items: [
        {
          icon: "Users",
          title: "Patient Registry",
          body: "Perfil clínico estructurado y registro centralizado de candidatos.",
        },
        {
          icon: "FlaskConical",
          title: "Protocol Matcher",
          body: "Motor de matching contra criterios de inclusión y exclusión.",
        },
        {
          icon: "KanbanSquare",
          title: "Screening Tracker",
          body: "Kanban de estados con trazabilidad de cada decisión.",
        },
        {
          icon: "RefreshCw",
          title: "Re-Match",
          body: "Re-evalúa cohortes cuando cambian protocolos o criterios.",
        },
        {
          icon: "MessageSquare",
          title: "Asistente IA",
          body: "Consulta criterios y resúmenes clínicos en chat contextual.",
        },
      ],
    },
    faq: {
      eyebrow: "Preguntas frecuentes",
      title: "Lo que preguntan los research sites.",
      items: [
        {
          q: "¿Necesito integrar con mi EHR?",
          a: "El MVP funciona como registro independiente. Puedes importar datos manualmente o vía APIs en fases posteriores.",
        },
        {
          q: "¿Cuánto dura el trial?",
          a: "14 días en plan Starter: hasta 50 pacientes y 3 protocolos activos sin tarjeta para empezar.",
        },
        {
          q: "¿Cómo funciona Site Pro?",
          a: "Plan con mayor volumen de pacientes y protocolos, más re-match y asistente IA.",
        },
        {
          q: "¿Los datos están aislados por sitio?",
          a: "Sí. Cada research site es una organización con RLS en Supabase; solo tu equipo ve tus pacientes y protocolos.",
        },
      ],
    },
    testimonials: {
      eyebrow: "Prueba social",
      title: "Diseñado con coordinadores de estudios.",
      subtitle: "Testimonios de referencia del MVP — reemplázalos con casos reales de tu site.",
      items: [
        {
          quote:
            "Dejamos de perder candidatos en hojas de cálculo. El matcher nos dice en minutos quién califica.",
          author: "Coordinadora de research",
          role: "Site piloto · Oncología",
        },
        {
          quote:
            "El tracker tipo Kanban es lo que nuestro equipo pedía: todos ven el mismo estado de screening.",
          author: "Investigador principal",
          role: "Centro universitario",
        },
        {
          quote:
            "El asistente IA acelera la revisión de criterios de exclusión sin abrir cada protocolo completo.",
          author: "Study coordinator",
          role: "Research site regional",
        },
      ],
    },
    finalCta: {
      eyebrow: "Tu turno",
      title: "Empieza el trial en tu research site.",
      subtitle:
        "Crea tu cuenta, registra pacientes y activa tu primer protocolo en la misma tarde.",
      cta: { label: "Entrar a la app", href: "/login?from=/dashboard" },
      ctaSecondary: { label: "Unirme a waitlist", href: "#waitlist" },
    },
    waitlist: {
      eyebrow: "Waitlist",
      title: "¿Quieres novedades antes del trial?",
      subtitle:
        "Te avisamos de integraciones, nuevas funciones y disponibilidad en tu región.",
      successMessage: "¡Listo! Te avisamos cuando haya novedades.",
      buttonLabel: "Quiero entrar",
      placeholder: "tu@researchsite.com",
    },
    footer: {
      tagline: "Pre-screening inteligente para research sites.",
      columns: [
        {
          title: "Recursos",
          links: [
            { label: "Documentación", href: "/docs" },
            { label: "Precios", href: "#pricing" },
            { label: "Waitlist", href: "#waitlist" },
          ],
        },
      ],
    },
  },

    pricing: {
    eyebrow: "Suscripciones",
    title: "Planes para tu research site",
    subtitle:
      "Elige un plan y entra a la app con el botón «Entrar».",
    plans: [
      {
        id: "starter",
        name: "Starter",
        price: 0,
        currency: "USD",
        interval: "mes",
        description: "Ideal para pilotear pre-screening en un sitio.",
        features: [
          "14 días de prueba",
          "Hasta 50 pacientes",
          "3 protocolos activos",
          "1 usuario",
          "Motor de matching",
        ],
        cta: "Empezar gratis",
      },
      {
        id: "pro",
        name: "Site Pro",
        price: 149,
        currency: "USD",
        interval: "mes",
        description: "Para clínicas con varios protocolos y mayor volumen.",
        features: [
          "Hasta 500 pacientes",
          "50 protocolos activos",
          "3 usuarios (próximamente)",
          "Re-match automático",
          "Asistente IA clínico",
        ],
        cta: "Suscribirse a Pro",
        highlighted: true,
        stripePriceId: "",
      },
    ],
  },
};

export default config;
