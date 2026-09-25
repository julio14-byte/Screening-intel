/**
 * Config central del producto.
 * Cambiar branding, copy, features y pricing aquí altera el producto sin abrir JSX.
 */
const config = {
  app: {
    name: "Crisvia",
    description:
      "Inteligencia de screening para clinical research sites. Aprovechá los pacientes que YA llegan. EDC, ePRO e IWRS de terceros por webhook.",
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
        href: "/patients",
        label: "Registro",
        icon: "Users",
        section: "screening" as const,
      },
      {
        href: "/integraciones",
        label: "Integraciones",
        icon: "Plug",
        section: "integraciones" as const,
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
      "/rematch",
      "/account",
      "/settings",
      "/settings/roles",
      "/settings/portal",
      "/settings/security",
      "/candidatos",
      "/cola",
      "/avisos",
      "/integraciones",
      "/edc",
      "/epro",
      "/iwrs",
      "/agenda",
      "/seguimiento",
      "/cierre",
      "/inventario",
      "/dispensacion",
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
      "/api/integraciones/inbound",
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
      integraciones: "/integraciones",
      pacientes: "/patients",
      edc: "/edc",
      iwrs: "/iwrs",
      agenda: "/agenda",
      seguimiento: "/seguimiento",
      cierre: "/cierre",
      inventario: "/inventario",
      dispensacion: "/dispensacion",
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
      eyebrow: "Versión 1",
      title: "Cinco módulos de screening. Nada de vender una base de pacientes.",
      subtitle:
        "Para coordinadores de clinical research sites. EDC, ePRO e IWRS quedan en el tercero del estudio.",
      items: [
        {
          icon: "Users",
          title: "1. Patient Registry",
          body: "Quienes YA están en tu site. Alta, CSV y búsqueda. Entrada al matching, no un listado para reclutar.",
        },
        {
          icon: "ClipboardList",
          title: "2. Clinical Profile",
          body: "Historia, antecedentes, medicamentos y laboratorios. El coordinador lo llena; el matcher lo usa.",
        },
        {
          icon: "FlaskConical",
          title: "3. Protocol Matcher",
          body: "Paciente ↔ protocolo. Motor de reglas 🟢🟡🔴. La IA explica; no cambia quién entra.",
        },
        {
          icon: "KanbanSquare",
          title: "4. Screening Tracker",
          body: "Pre-screening → Screening → Randomizado → Screen failure. No es un sorteo. El IRT del sponsor confirma Randomizado por webhook.",
        },
        {
          icon: "RefreshCw",
          title: "5. Re-Match & Follow-up",
          body: "Un screen failure no es el final: otros protocolos activos donde todavía califica.",
        },
        {
          icon: "Plug",
          title: "Integraciones",
          body: "EDC, ePRO e IWRS los opera un tercero. Webhook HMAC. No es un conector Lilly ni Medidata.",
        },
      ],
    },
    faq: {
      eyebrow: "Preguntas frecuentes",
      title: "Lo que preguntan los clinical research sites.",
      items: [
        {
          q: "¿Crisvia es una base de datos de pacientes?",
          a: "No. El registro es la entrada al matching. Vendemos inteligencia de screening para el clinical research site, no un listado para reclutar ni para revender. La propuesta es aprovechar a quienes YA llegan a tu clínica.",
        },
        {
          q: "¿Crisvia es screening, EDC y ePRO?",
          a: "Crisvia es screening (elegibilidad). EDC, ePRO e IWRS los usa el estudio en sistemas de terceros: se conectan en /integraciones con un webhook HTTPS firmado. El matcher no randomiza ni captura visitas. No es Medidata Rave ni un IRT de farmacéutica.",
        },
        {
          q: "¿El matching reduce el tiempo de screening un 42,6%?",
          a: "Esa cifra no es de Crisvia. Un trabajo sobre TrialGPT la reportó en su evaluación; no es una garantía de esta app. El recorte real se mide en tu site: 100 pacientes históricos y 2 protocolos, cronómetro en mano.",
        },
        {
          q: "¿El screening es un sorteo digital para elegir pacientes?",
          a: "No. El screening es un filtro de elegibilidad: el motor de reglas compara el expediente con inclusión y exclusión (🟢 cumple, 🟡 falta un dato, 🔴 no cumple). No hay azar y la IA no decide quién entra. El paso aleatorio es el IWRS del sponsor: asigna kit y brazo cuando el paciente ya está en Screening y avisa a Crisvia por webhook.",
        },
        {
          q: "¿Crisvia se conecta al IWRS de Lilly o de otra farmacéutica?",
          a: "No hay un enchufe único. Lilly y el resto usan un IRT por estudio (a menudo IQVIA, Suvoda, Medidata, etc.). En /integraciones configurás la URL y el secreto HMAC de ese estudio. Una API en vivo requiere contrato, credenciales y el mapeo; no lo inventamos.",
        },
        {
          q: "¿Hace falta una app tipo Clinical Ink para el diario de medicación?",
          a: "Eso lo resuelve el EDC o el ePRO del tercero, no Crisvia. Después del screening, el sujeto vive en esos sistemas. Crisvia no dispensa caja ni hospeda /diario ni /epro-app como producto.",
        },
        {
          q: "¿Cómo paso datos de Clinical Ink o de IQVIA al screening?",
          a: "Sí, si el CSV es de screening (DM+MH+CM+LB). Después: Protocolos → Ejecutar matching. El motor de reglas compara edad, sexo, diagnósticos, medicación y labs (también sinónimos EN/ES: Type 2 diabetes → diabetes tipo 2). El diario Clinical Ink y el IRT de IQVIA no alcanzan para el match. La IA no cambia el veredicto.",
        },
        {
          q: "¿Cómo se conectan EDC, ePRO e IWRS?",
          a: "Outbound: cuando el screening pasa a elegible, screen failure o randomizado, Crisvia hace POST al webhook del proveedor con X-Crisvia-Signature (HMAC-SHA256). Inbound: el IWRS llama POST /api/integraciones/inbound con la misma firma o Bearer y protocol_code + subject_code + kit_code. Entonces el tracker marca Randomizado.",
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
            "El matcher nos dice en minutos quién de los que YA están en el site califica. Un screen failure ya no se pierde.",
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
        "Un protocolo, una cohorte que ya está en tu site, el primer cruce el mismo día.",
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
      tagline: "Inteligencia de screening para clinical research sites.",
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
