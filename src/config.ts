/**
 * Config central del producto.
 * Cambiar branding, copy, features y pricing aquí altera el producto sin abrir JSX.
 */
const config = {
  app: {
    name: "Crisvia",
    description:
      "Screening, EDC y ePRO para clinical research sites. El IWRS es un módulo independiente conectado por API.",
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
        href: "/candidatos",
        label: "Candidatos",
        icon: "UserPlus",
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
        href: "/rematch",
        label: "Re-Match",
        icon: "RefreshCw",
        section: "screening" as const,
      },
      {
        href: "/cola",
        label: "Cola de trabajo",
        icon: "ListTodo",
        section: "screening" as const,
      },
      {
        href: "/avisos",
        label: "Avisos",
        icon: "Bell",
        section: "screening" as const,
      },
      {
        href: "/edc",
        label: "EDC",
        icon: "FileSpreadsheet",
        section: "edc" as const,
      },
      {
        href: "/patients",
        label: "Pacientes",
        icon: "Users",
        section: "edc" as const,
      },
      {
        href: "/agenda",
        label: "Agenda",
        icon: "Calendar",
        section: "edc" as const,
      },
      {
        href: "/inventario",
        label: "Inventario",
        icon: "Package",
        section: "edc" as const,
      },
      {
        href: "/dispensacion",
        label: "Dispensación",
        icon: "Pill",
        section: "edc" as const,
      },
      {
        href: "/epro",
        label: "ePRO",
        icon: "ClipboardList",
        section: "epro" as const,
      },
      {
        href: "/iwrs",
        label: "IWRS",
        icon: "Dices",
        section: "iwrs" as const,
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

  /** URLs canónicas — middleware, nav y landing leen desde aquí. */
  routes: {
    landing: "/",
    login: "/login",
    loginMfa: "/login/mfa",
    afterLogin: "/dashboard",
    protected: [
      "/dashboard",
      "/patients",
      "/protocols",
      "/tracker",
      "/epro",
      "/rematch",
      "/account",
      "/settings",
      "/settings/roles",
      "/settings/portal",
      "/settings/security",
      "/candidatos",
      "/cola",
      "/avisos",
      "/agenda",
      "/inventario",
      "/dispensacion",
      "/edc",
      "/iwrs",
      "/semaforos",
      "/devices",
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
      "/api/diario/t",
      "/api/epro-app/p",
    ],
    candidato: {
      hub: "/candidato",
      gracias: "/candidato/gracias",
    },
    diario: "/diario",
    eproApp: "/epro-app",
    app: {
      dashboard: "/dashboard",
      patients: "/patients",
      protocols: "/protocols",
      semaforos: "/semaforos",
      devices: "/devices",
      tracker: "/tracker",
      epro: "/epro",
      eproApp: "/epro-app",
      rematch: "/rematch",
      billing: "/account/billing",
      roles: "/settings/roles",
      portalSettings: "/settings/portal",
      security: "/settings/security",
      candidatos: "/candidatos",
      cola: "/cola",
      avisos: "/avisos",
      agenda: "/agenda",
      inventario: "/inventario",
      dispensacion: "/dispensacion",
      edc: "/edc",
      iwrs: "/iwrs",
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
      { label: "Waitlist", href: "#waitlist" },
      { label: "Entrar", href: "#entrar" },
    ],
    hero: {
      eyebrow: "Clinical research sites · Pre-screening clínico",
      title: "Encuentra candidatos al protocolo correcto, más rápido.",
      subtitle:
        "Pre-screening y re-matching de pacientes para protocolos de investigación clínica.",
    },
    enterApp: {
      eyebrow: "Acceso",
      title: "¿Listo para usar la app?",
      subtitle: "Inicia sesión con tu cuenta de clinical research site.",
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
          body: "Revisar criterios uno por uno contra cada paciente consume días del equipo del clinical research site.",
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
        "Diseñado para coordinadores de clinical research sites con protocolos activos y cohortes en crecimiento.",
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
          icon: "FileSpreadsheet",
          title: "EDC del centro",
          body: "Expediente, visitas, inventario y dispensación. Captura clínica del site, no un EDC CDISC certificado.",
        },
        {
          icon: "ClipboardList",
          title: "ePRO",
          body: "Cuestionarios del paciente. El coordinador invita desde el EDC; el sujeto entra en /epro-app con código y PIN. Distinto del diario de toma y del IWRS.",
        },
        {
          icon: "Dices",
          title: "IWRS por API",
          body: "Módulo independiente: Screening y EDC piden kit/brazo a /api/iwrs. No vive dentro del matcher.",
        },
        {
          icon: "RefreshCw",
          title: "Re-Match",
          body: "Re-evalúa cohortes cuando cambian protocolos o criterios.",
        },
        {
          icon: "ListTodo",
          title: "Cola de trabajo",
          body: "Inbox, criterios 🟡 y re-match en tareas guardadas. El coordinador confirma cada paso.",
        },
        {
          icon: "Package",
          title: "Inventario de estudio",
          body: "Lotes de la farmacéutica por protocolo. Tras IWRS, farmacia entrega la caja en /dispensacion y el paciente registra la toma en /diario.",
        },
      ],
    },
    faq: {
      eyebrow: "Preguntas frecuentes",
      title: "Lo que preguntan los clinical research sites.",
      items: [
        {
          q: "¿Crisvia es screening, EDC y ePRO?",
          a: "Sí: Screening (elegibilidad), EDC (expediente, visitas, farmacia) y ePRO (cuestionarios) viven en la misma app. El IWRS es un módulo aparte: kit y brazo se piden por /api/iwrs; el matcher no randomiza. No es Medidata Rave ni un IRT de farmacéutica.",
        },
        {
          q: "¿El screening es un sorteo digital para elegir pacientes?",
          a: "No. El screening es un filtro de elegibilidad: el motor de reglas compara el expediente con inclusión y exclusión (🟢 cumple, 🟡 falta un dato, 🔴 no cumple). No hay azar y la IA no decide quién entra. El paso que sí es aleatorio es IWRS: asigna kit y brazo cuando el paciente ya está en Screening. Se configura por protocolo (brazos, cegamiento, bloques permutados) en /iwrs.",
        },
        {
          q: "¿Crisvia se conecta al IWRS de Lilly o de otra farmacéutica?",
          a: "No hay un enchufe único. Lilly y el resto usan un IRT por estudio (a menudo IQVIA, Suvoda, Medidata, etc.) y ese sistema es la fuente de verdad. En /iwrs el protocolo puede ser IWRS del centro (Crisvia sortea) o IWRS del sponsor (el coordinador registra el kit que ya asignó ese IRT). Una API en vivo requiere contrato, credenciales y el mapeo de ese estudio; no lo inventamos.",
        },
        {
          q: "¿Hace falta una app tipo Clinical Ink para el diario de medicación?",
          a: "No. Después del IWRS, farmacia entrega la caja en /dispensacion, registra la primera dosis (en la clínica o oral para llevar) y genera un link /diario. El paciente anota hora y síntomas ahí; el centro lo ve en el expediente. Una app aparte duplicaría login, PHI y mantenimiento. El ePRO móvil (/epro-app) es otro módulo: síntomas y calidad de vida, no la toma. Esto no es un eSource tipo Clinical Ink.",
        },
        {
          q: "¿El ePRO móvil muestra el nombre del paciente?",
          a: "No. El sujeto no se registra solo: el coordinador genera un link de 48 horas desde el expediente. El paciente valida el año de nacimiento, crea un PIN de 6 dígitos y después entra con código de sujeto + PIN. La interfaz solo muestra ese código. La sesión caduca a los 3 minutos de inactividad. Cada respuesta diaria entra a la bitácora (quién/sujeto, UTC, acción, valor). El diseño se alinea a HIPAA, GDPR y 21 CFR Part 11; no es una certificación.",
        },
        {
          q: "¿Necesito un EHR hospitalario?",
          a: "No. El expediente es interno: registro manual, CSV y portal de candidatos. No hay conexión con un EHR externo.",
        },
        {
          q: "¿Cuánto dura el trial?",
          a: "14 días en plan Starter: hasta 50 pacientes y 3 protocolos activos sin tarjeta para empezar.",
        },
        {
          q: "¿Cómo funciona Site Pro?",
          a: "Plan con mayor volumen de pacientes y protocolos, más re-match y cola de trabajo.",
        },
        {
          q: "¿Los datos están aislados por sitio?",
          a: "Sí. Cada clinical research site es una organización con RLS en Supabase; solo tu equipo ve tus pacientes y protocolos.",
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
          author: "Coordinadora de clinical research site",
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
            "La cola de trabajo junta inbox, criterios pendientes y re-match. El coordinador confirma cada paso.",
          author: "Study coordinator",
          role: "Clinical research site regional",
        },
      ],
    },
    finalCta: {
      eyebrow: "Tu turno",
      title: "Empieza el trial en tu clinical research site.",
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
      tagline: "Pre-screening inteligente para clinical research sites.",
      links: [
        { label: "Precios", href: "#pricing" },
        { label: "Waitlist", href: "#waitlist" },
        { label: "Documentación", href: "/docs" },
      ],
    },
  },

  pricing: {
    eyebrow: "Suscripciones",
    title: "Elige tu plan",
    subtitle: "Free para empezar. Pro y Pro+ para clinical research sites en crecimiento.",
    plans: [
      {
        id: "free",
        name: "Free",
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
        name: "Pro",
        price: 399,
        currency: "USD",
        interval: "mes",
        description: "Para clínicas con varios protocolos y mayor volumen.",
        features: [
          "Hasta 500 pacientes",
          "50 protocolos activos",
          "3 usuarios",
          "Re-match automático",
          "Asistente IA clínico",
        ],
        cta: "Suscribirse a Pro",
        highlighted: true,
        stripePriceId: "",
      },
      {
        id: "pro_plus",
        name: "Pro+",
        price: 699,
        currency: "USD",
        interval: "mes",
        description: "Máximo volumen, multi-equipo y operaciones avanzadas.",
        features: [
          "Hasta 2.000 pacientes",
          "100 protocolos activos",
          "10 usuarios",
          "Re-match prioritario",
          "Asistente IA + soporte dedicado",
        ],
        cta: "Suscribirse a Pro+",
        stripePriceId: "",
      },
    ],
  },
};

export default config;
