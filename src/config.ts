/**
 * Config central del producto.
 * Cambiar branding, copy, features y pricing aquí altera el producto sin abrir JSX.
 */
const config = {
  app: {
    name: "Crisvia",
    description:
      "Inteligencia de screening para clinical research sites. Aprovechá los pacientes que YA llegan.",
    domain: "screening-intel.vercel.app",
    locale: "es",
    defaultUrl: "http://localhost:3000",
    nav: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: "LayoutDashboard",
      },
      {
        href: "/patients",
        label: "Registro",
        icon: "Users",
        section: "screening" as const,
      },
      {
        href: "/protocols",
        label: "Protocolos",
        icon: "FlaskConical",
        section: "screening" as const,
      },
      {
        href: "/tracker",
        label: "Tracker",
        icon: "KanbanSquare",
        section: "screening" as const,
      },
      {
        href: "/bitacora",
        label: "Bitácora",
        icon: "ScrollText",
        section: "screening" as const,
      },
      {
        href: "/rematch",
        label: "Re-Match",
        icon: "RefreshCw",
        section: "screening" as const,
      },
      {
        href: "/citas",
        label: "Citas",
        icon: "CalendarDays",
        section: "screening" as const,
      },
      {
        href: "/candidatos",
        label: "Candidatos",
        icon: "UserPlus",
        section: "screening" as const,
      },
      {
        href: "/avisos",
        label: "Avisos",
        icon: "Bell",
        section: "screening" as const,
      },
      {
        href: "/seguimiento",
        label: "Seguimiento",
        icon: "CalendarCheck",
        section: "estudio" as const,
      },
      {
        href: "/dispensacion",
        label: "Dispensación",
        icon: "Pill",
        section: "estudio" as const,
      },
      {
        href: "/equipo",
        label: "Equipo",
        icon: "UsersRound",
        section: "estudio" as const,
      },
      {
        href: "/account/billing",
        label: "Facturación",
        icon: "CreditCard",
        feature: "payments" as const,
      },
    ],
  },

  brand: {
    primary: "#7c3aed",
    logoText: "Crisvia",
    /** Subtítulo bajo el logo (nav, sidebar, metadata). */
    tagline: "Clinical Research Sites",
    logoSrc: null as string | null,
    radius: "0.75rem",
  },

  features: {
    waitlist: true,
    emailLogin: true,
    pricing: true,
    payments: true,
  },

  productMetrics: {
    enabled: false,
    founderEmails: [] as string[],
  },

  legal: {
    entityName: process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME ?? "",
    address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS ?? "",
    privacyEmail: process.env.NEXT_PUBLIC_PRIVACY_EMAIL ?? "",
    privacyNoticeUpdated: "2026-10-21",
  },

  /** URLs canónicas — middleware, nav y landing leen desde aquí. */
  routes: {
    landing: "/",
    login: "/login",
    loginMfa: "/login/mfa",
    privacy: "/privacidad",
    afterLogin: "/dashboard",
    protected: [
      "/dashboard",
      "/patients",
      "/protocols",
      "/tracker",
      "/bitacora",
      "/rematch",
      "/account",
      "/settings",
      "/settings/roles",
      "/settings/portal",
      "/settings/site",
      "/settings/security",
      "/candidatos",
      "/citas",
      "/avisos",
      "/seguimiento",
      "/dispensacion",
      "/equipo",
    ],
    publicApis: [
      "/api/auth/login",
      "/api/auth/logout",
      "/api/auth/session",
      "/api/waitlist",
      "/api/webhooks/stripe",
      "/api/openapi",
      "/api/candidato/config",
      "/api/candidato/enviar",
    ],
    candidato: {
      hub: "/candidato",
      gracias: "/candidato/gracias",
    },
    app: {
      dashboard: "/dashboard",
      patients: "/patients",
      protocols: "/protocols",
      tracker: "/tracker",
      bitacora: "/bitacora",
      rematch: "/rematch",
      billing: "/account/billing",
      roles: "/settings/roles",
      portalSettings: "/settings/portal",
      siteSettings: "/settings/site",
      security: "/settings/security",
      candidatos: "/candidatos",
      citas: "/citas",
      seguimiento: "/seguimiento",
      dispensacion: "/dispensacion",
      equipo: "/equipo",
      avisos: "/avisos",
      pacientes: "/patients",
      docs: "/docs",
      apiDocs: "/docs/api",
    },
    apis: {
      openApi: "/api/openapi",
      waitlist: "/api/waitlist",
      authLogin: "/api/auth/login",
      authLogout: "/api/auth/logout",
      authSession: "/api/auth/session",
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
    afterLogoutUrl: "/",
    landingUrl: "/",
  },

  landing: {
    nav: [
      { label: "Documentación", href: "#docs" },
      { label: "Precios", href: "#pricing" },
      { label: "Hoy", href: "#hoy" },
      { label: "Waitlist", href: "#waitlist" },
      { label: "Entrar", href: "#entrar" },
    ],
    hero: {
      eyebrow: "Inteligencia de screening · Clinical research sites",
      title: "Aprovechá mejor los pacientes que YA llegan a tu clínica.",
      subtitle:
        "Cada llegada es una oportunidad de investigación. Crisvia identifica para qué protocolo puede ser candidato y evita que un screen failure se convierta en un paciente perdido.",
    },
    enterApp: {
      eyebrow: "Acceso",
      title: "¿Listo para usar la app?",
      subtitle: "Inicia sesión con tu cuenta de clinical research site.",
    },
    problem: {
      eyebrow: "El problema",
      title: "El cuello de botella no es reclutar. Es aprovechar a quien ya llegó.",
      subtitle:
        "Los competidores prometen más pacientes. El site ya tiene gente en sala, en Excel y en screen failure. Ahí se pierde el tiempo.",
      items: [
        {
          icon: "Timer",
          title: "Screening lento",
          body: "Cruzar a mano el expediente contra inclusión y exclusión consume días del coordinador.",
        },
        {
          icon: "FileSpreadsheet",
          title: "Datos fragmentados",
          body: "Pacientes en Excel, protocolos en PDF y estados de screening en otro lugar — sin una fuente de verdad.",
        },
        {
          icon: "UserX",
          title: "Screen failure = paciente perdido",
          body: "Si falló un estudio, casi nunca se re-evalúa contra los otros protocolos activos del mismo centro.",
        },
      ],
    },
    features: {
      eyebrow: "Producto",
      title: "Screening para clinical research sites",
      subtitle: "Registro, perfil, matching, tracker, re-match y la visita.",
      items: [
        {
          icon: "Users",
          title: "Registro",
          body: "Pacientes del centro, alta e importación.",
        },
        {
          icon: "ClipboardList",
          title: "Perfil clínico",
          body: "Historia, medicamentos y laboratorios.",
        },
        {
          icon: "FlaskConical",
          title: "Matching",
          body: "Criterios de inclusión y exclusión, revisados contra la fuente.",
        },
        {
          icon: "KanbanSquare",
          title: "Tracker",
          body: "Pre-screening, screening, randomizado y screen failure.",
        },
        {
          icon: "RefreshCw",
          title: "Re-Match",
          body: "Screen failures frente a otros protocolos activos.",
        },
        {
          icon: "CalendarCheck",
          title: "Visita y diario",
          body: "Calendario del site y revisión de lo visto en Veeva o Clinical Ink. El diario sigue en el sistema del patrocinador.",
        },
      ],
    },
    faq: {
      eyebrow: "Preguntas frecuentes",
      title: "Planes y acceso",
      items: [
        {
          q: "¿Cuánto dura el trial?",
          a: "14 días en el plan Free: hasta 50 pacientes y 3 protocolos activos, sin tarjeta.",
        },
        {
          q: "¿Cuánto cuesta y qué incluye cada plan?",
          a: "Free $0, Pro $149 USD/mes (500 pacientes, 50 protocolos, 3 usuarios) y Pro+ $329 USD/mes (2,000 pacientes, 100 protocolos, 10 usuarios). Los límites se aplican en la base de datos: al llegar al tope no se pueden agregar más, pero tus datos siguen disponibles.",
        },
        {
          q: "¿Qué datos de mis pacientes ve la IA?",
          a: "Ninguno de identificación. Antes de cada consulta se enmascaran nombre, correo, teléfono, CURP, RFC, dirección y fecha de nacimiento, y la elegibilidad la decide el motor de reglas del protocolo, no el modelo.",
        },
        {
          q: "¿Los datos están aislados por sitio?",
          a: "Sí. Cada clinical research site es una organización con RLS en Supabase; solo tu equipo ve tus pacientes y protocolos.",
        },
      ],
    },
    status: {
      eyebrow: "Hoy",
      title: "Lo que está listo para mostrar",
      subtitle:
        "Se recorre el día del coordinador. Los sites de pago se publican cuando existan.",
      items: [
        {
          title: "Producto",
          body: "Portal, expediente, matcher de reglas, revisión con evidencia, tracker, Re-Match, visitas y revisión del diario. Veeva o Clinical Ink siguen siendo el sistema del patrocinador.",
        },
        {
          title: "Modelo",
          body: "Paga el clinical research site. Free 14 días, Pro $149 y Pro+ $329 USD al mes por sitio, sin costo de implementación.",
        },
        {
          title: "Mercado",
          body: "México tenía del orden de 5,000 estudios clínicos documentados en abril de 2024, y más de 5,200 registrados hacia febrero de 2025, incluidos estudios ya cerrados.",
        },
      ],
      source:
        "Mercado: UNAM / CIC, 2025; Statista, febrero de 2025. Buscamos tres sites piloto para el trial de 14 días.",
    },
    finalCta: {
      eyebrow: "Tu turno",
      title: "Empieza el trial en tu clinical research site.",
      subtitle:
        "Un protocolo, una cohorte que ya está en tu site, el primer cruce el mismo día.",
      cta: { label: "Entrar a la app", href: "/login?from=/dashboard" },
      ctaSecondary: { label: "Unirme a waitlist", href: "#waitlist" },
    },
    waitlist: {
      eyebrow: "Waitlist",
      title: "¿Quieres novedades antes del trial?",
      subtitle:
        "Te avisamos de nuevas funciones y disponibilidad en tu región.",
      successMessage: "¡Listo! Te avisamos cuando haya novedades.",
      buttonLabel: "Quiero entrar",
      placeholder: "tu@researchsite.com",
    },
    footer: {
      tagline: "Inteligencia de screening para clinical research sites.",
      links: [
        { label: "Precios", href: "#pricing" },
        { label: "Waitlist", href: "#waitlist" },
        { label: "Documentación", href: "/docs" },
        { label: "Privacidad", href: "/privacidad" },
      ],
    },
  },

  pricing: {
    eyebrow: "Suscripciones",
    title: "Un plan para cada site",
    subtitle:
      "Precios en USD por sitio, sin costo de implementación. Cancelas cuando quieras.",
    plans: [
      {
        id: "free",
        name: "Free",
        price: 0,
        currency: "USD",
        interval: "mes",
        description: "Para probar el screening en un site, sin tarjeta.",
        features: [
          "14 días de prueba",
          "Hasta 50 pacientes",
          "3 protocolos activos",
          "1 usuario",
          "Matcher de reglas 🟢🟡🔴",
          "Tracker y citas",
        ],
        cta: "Empezar gratis",
      },
      {
        id: "pro",
        name: "Pro",
        price: 149,
        currency: "USD",
        interval: "mes",
        description: "Para un site con varios protocolos abiertos y equipo pequeño.",
        features: [
          "Hasta 500 pacientes",
          "50 protocolos activos",
          "3 usuarios",
          "Re-Match entre protocolos",
          "Portal de candidatos y avisos",
          "Explicación del match con IA",
          "Soporte por correo",
        ],
        cta: "Suscribirse a Pro",
        highlighted: true,
        stripePriceId: "",
      },
      {
        id: "pro_plus",
        name: "Pro+",
        price: 329,
        currency: "USD",
        interval: "mes",
        description: "Para sites de alto volumen o con varios coordinadores.",
        features: [
          "Hasta 2,000 pacientes",
          "100 protocolos activos",
          "10 usuarios",
          "Todo lo de Pro",
          "Roles, MFA y bitácora de auditoría",
          "Soporte prioritario",
        ],
        cta: "Suscribirse a Pro+",
        stripePriceId: "",
      },
    ],
  },
};

export default config;
