/**
 * Páginas públicas de privacidad, regulaciones, ETL e integraciones.
 * Copy en español latinoamericano (tú). No afirma certificaciones que el site no tenga.
 */

export type TrustSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type TrustPage = {
  title: string;
  subtitle: string;
  updated: string;
  sections: TrustSection[];
};

export const privacyPage: TrustPage = {
  title: "Privacidad y regulaciones",
  subtitle:
    "Cómo Screenlane trata datos de screening en clinical research sites, y con qué marcos se alinea el producto.",
  updated: "12 de septiembre de 2026",
  sections: [
    {
      id: "responsable",
      title: "Quién es el responsable",
      paragraphs: [
        "El clinical research site (tu organización) es el responsable del tratamiento de los datos de pacientes y candidatos. Screenlane opera como plataforma SaaS: aloja, procesa y muestra esa información para pre-screening, matching y re-match.",
        "Los pacientes que se pre-registran en el portal público lo hacen frente a tu centro, no como usuarios de una red social de Screenlane.",
      ],
    },
    {
      id: "que-datos",
      title: "Qué datos se tratan",
      paragraphs: [
        "Solo los necesarios para el funnel de screening. No vendemos datos clínicos ni los usamos para entrenar modelos de terceros.",
      ],
      bullets: [
        "Identidad operativa: nombre, fecha de nacimiento, sexo, identificadores del centro o del EHR.",
        "Perfil clínico de screening: condiciones, medicación, laboratorios, notas que el equipo carga o importa.",
        "Protocolos y resultados del motor de reglas (veredicto, score, detalle por criterio).",
        "Cuenta del staff: email, rol clínico, MFA y bitácora de acciones.",
        "Facturación: datos de Stripe (no almacenamos números de tarjeta).",
      ],
    },
    {
      id: "medidas",
      title: "Medidas de privacidad en el producto",
      paragraphs: [
        "El aislamiento es por organización: tu equipo no ve pacientes ni protocolos de otro clinical research site.",
      ],
      bullets: [
        "Row Level Security en PostgreSQL (Supabase) y RBAC clínico (investigator, sub-investigator, coordinator, monitor).",
        "MFA TOTP obligatorio en producción para investigator y sub-investigator.",
        "Sesión con inactividad de 30 minutos y tope absoluto de 8 horas.",
        "El portal público no expone secretos del centro (webhook EHR, facturación).",
        "La IA recibe iniciales y el resultado del motor de reglas; no cambia la elegibilidad ni debe recibir el nombre completo.",
        "Webhooks EHR firmados con HMAC; bitácora append-only para cambios clínicos.",
      ],
    },
    {
      id: "ia",
      title: "Inteligencia artificial",
      paragraphs: [
        "El matching lo decide un motor de reglas, no un LLM. GPT-4o-mini se usa para justificar un veredicto ya calculado, extraer criterios de un PDF, un perfil desde notas, un lab en PDF o una foto de receta, y para el asistente clínico.",
        "Esas llamadas salen hacia OpenAI. No envíes PHI nominativo en notas o chats si tu SOP lo prohíbe; el producto está pensado para trabajar con iniciales y criterios, no con historia clínica completa.",
      ],
    },
    {
      id: "regulaciones",
      title: "Regulaciones (alineación, no certificación)",
      paragraphs: [
        "Screenlane no sustituye el programa de cumplimiento de tu site ni emite una certificación HIPAA, GDPR o COFEPRIS. Los controles del producto están diseñados para que un clinical research site pueda operar estudios con sponsors de EE. UU. y de LatAm.",
      ],
      bullets: [
        "21 CFR Part 11: bitácora append-only, autoría, fecha/hora y eventos clínicos trazables.",
        "ICH-GCP / BPC: separación de roles (PI, sub-investigator, coordinator, monitor/CRA) y decisión de elegibilidad auditable.",
        "HIPAA (EE. UU.): controles técnicos de acceso, cifrado en tránsito (HTTPS) y minimización hacia proveedores de IA. El BAA y el análisis de riesgo los cierra tu organización con sus asesores.",
        "GDPR (UE/EEE): el site es responsable; Screenlane actúa como encargado. Derechos de acceso y borrado se ejercen a través del centro.",
        "LatAm: LFPDPPP (México), Ley 25.326 (Argentina), Ley 1581 (Colombia) y leyes equivalentes. Residencia de datos: el proyecto Supabase que configures (elige región al provisionar).",
      ],
    },
    {
      id: "conservacion",
      title: "Conservación y contacto",
      paragraphs: [
        "Los datos permanecen mientras tu organización tenga cuenta activa y según el periodo de retención que exija el protocolo o el sponsor. Al cerrar el site, coordina export y borrado con quien opera Screenlane.",
        "Para ejercer derechos ARCO/GDPR o reportar un incidente, escribe al investigador principal de tu centro o al contacto de privacidad que te indiquen. Esta página describe el producto; no es un dictamen legal.",
      ],
    },
  ],
};

export const integrationsPage: TrustPage = {
  title: "ETL e integraciones",
  subtitle:
    "Cómo entran, se normalizan y se usan los datos clínicos: del EHR o el CSV al matching, sin que la IA decida elegibilidad.",
  updated: "12 de septiembre de 2026",
  sections: [
    {
      id: "etl",
      title: "ETL clínico (Extract → Transform → Load)",
      paragraphs: [
        "Screenlane no exige un EHR para arrancar. Cuando lo conectas, el flujo es un ETL acotado al screening — no un data warehouse hospitalario.",
      ],
      bullets: [
        "Extract: CSV, alta manual, portal, PDF de laboratorio, foto de receta, sync batch del EHR o webhook en tiempo real (JSON / FHIR Bundle).",
        "Transform: perfil clínico (condiciones, medicación, labs), normalización ICD-11 y evaluación con el motor de reglas.",
        "Load: pacientes y perfiles del centro, screenings, re-match y bitácora. Cada fila queda atada a tu organization_id / clinic_id.",
      ],
    },
    {
      id: "documentos",
      title: "PDF de laboratorio y foto de receta",
      paragraphs: [
        "Cuando el resultado aún no llega por EHR, el Extract del expediente es el documento que trae el paciente: un PDF de laboratorio o la receta fotografiada en consultorio.",
        "El flujo es el mismo ETL: extraes texto o imagen, transformas a condiciones / medicación / labs, y cargas al perfil al guardar. Un humano revisa el borrador. El matching no cambia: sigue siendo el motor de reglas.",
      ],
      bullets: [
        "PDF digital (texto seleccionable): se lee la capa de texto y GPT-4o-mini estructura el perfil.",
        "Foto de receta o de un lab impreso: JPEG, PNG o WebP; visión de GPT-4o-mini. HEIC no está soportado.",
        "PDF escaneado sin texto: fotografía las páginas con «Tomar foto». No inferimos OCR de páginas rasterizadas.",
        "No se copian nombres, DNI, direcciones ni firmas. Solo condiciones, medicación y valores numéricos.",
        "En /patients/[id] o POST /api/patients/profile/extract-document (permiso profiles:write). Revisa y pulsa Guardar perfil.",
      ],
    },
    {
      id: "ehr",
      title: "EHR (historia clínica electrónica)",
      paragraphs: [
        "Opcional. Compatible con un middleware hacia Epic, Cerner, FHIR u otro origen. Se configura en la app: Configuración → Integración EHR.",
      ],
      bullets: [
        "Fase 1 — Batch: POST /api/ehr/sync (sesión + permiso patients:write). Upsert por ehr_patient_id, 1–2 veces al día.",
        "Fase 2 — Webhook: POST /api/webhooks/ehr con X-Organization-Id y X-EHR-Signature (HMAC-SHA256).",
        "Eventos: patient.upsert, profile.update, observation.created. Idempotencia por event_id.",
        "Tras un lab o diagnóstico nuevo se recalcula matching y re-match del paciente.",
      ],
    },
    {
      id: "otras",
      title: "Otras integraciones",
      paragraphs: [
        "El resto del stack entra por API o por la propia app. No hay marketplace de conectores: cada canal está pensado para el funnel de screening.",
      ],
      bullets: [
        "CSV de pacientes: importación masiva en el registro.",
        "Portal /candidato: pre-registro público del centro (slug + protocolos activos).",
        "PDF de laboratorio y foto de receta: ver la sección anterior. Carga en /patients/[id].",
        "PDF de protocolo: extracción de criterios (el texto del sponsor no se traduce).",
        "ICD-11 (OMS): búsqueda y normalización de términos coloquiales.",
        "OpenAI GPT-4o-mini: justificación del matching, notas y asistente — sin cambiar elegibilidad.",
        "Stripe: trial, Checkout y portal de facturación.",
        "Dispositivos ESP32: vista de demostración en /devices; telemetría aún no está en producción.",
      ],
    },
    {
      id: "api",
      title: "API y autenticación",
      paragraphs: [
        "La referencia interactiva está en /docs/api (OpenAPI). Los webhooks de Stripe y EHR son servidor a servidor; el resto usa sesión Supabase (cookies).",
        "No expongas SUPABASE_SERVICE_ROLE_KEY ni el secreto HMAC del EHR en el navegador. El secreto webhook se muestra una sola vez al generarlo.",
      ],
    },
  ],
};
