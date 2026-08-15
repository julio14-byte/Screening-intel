/**
 * Config central del producto (plantilla VibeFast).
 * Cambiar features y pricing aquí altera rutas, paywall y vitrina de precios.
 */
const config = {
  app: {
    name: "Screening Intelligence",
    description:
      "Pre-screening y re-matching de pacientes para protocolos de investigación clínica.",
    domain: "screening-intel.vercel.app",
    locale: "es",
    defaultUrl: "http://localhost:3000",
  },

  features: {
    waitlist: true,
    emailLogin: true,
    aiChat: true,
    pricing: true,
    payments: true,
  },

  /** Métricas globales en el tablero (waitlist, signups, chat). */
  productMetrics: {
    enabled: true,
    founderEmails: [] as string[],
  },

  auth: {
    loginUrl: "/login",
    afterLoginUrl: "/dashboard",
    afterLogoutUrl: "/login",
    landingUrl: "/",
  },

  /** Planes SaaS Fase 1 — research site = organization */
  pricing: {
    eyebrow: "Precios",
    title: "Planes para tu research site",
    subtitle: "14 días de prueba. Luego un plan mensual simple vía Stripe.",
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
