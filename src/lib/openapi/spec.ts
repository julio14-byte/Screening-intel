import type { OpenAPIV3 } from "openapi-types";

const APP_ROLES = ["investigator", "sub_investigator", "coordinator", "monitor"];

const EXAMPLES = {
  login: { email: "demo@screening.local", password: "demo123" },
  waitlist: { email: "coordinador@clinica.com", source: "landing" },
  patientImport: {
    patients: [
      {
        first_name: "María",
        last_name: "García",
        birth_date: "1985-03-15",
        gender: "female",
        ethnicity: "mestizo",
        phone: "+54 11 5555-0101",
        subject_code: "10001",
        conditions: ["diabetes tipo 2"],
        medications: ["metformina"],
        laboratories: { glucosa: 110 },
      },
    ],
  },
  audit: {
    tableName: "patients",
    recordId: "00000000-0000-0000-0000-000000000001",
    description: "Aprobación de criterio de inclusión por investigador principal.",
    metadata: { protocol_id: "00000000-0000-0000-0000-000000000002", criterion: "Edad 18-75" },
  },
  assignRole: {
    userId: "00000000-0000-0000-0000-000000000003",
    role: "coordinator",
  },
  stripeCheckout: { planId: "pro" },
} as const;

/** Especificación OpenAPI 3.0 — Crisvia REST API. */
export function buildOpenApiSpec(baseUrl: string): OpenAPIV3.Document {
  const errorSchema: OpenAPIV3.SchemaObject = {
    type: "object",
    properties: { error: { type: "string" } },
    required: ["error"],
  };

  const appRoleSchema: OpenAPIV3.SchemaObject = {
    type: "string",
    enum: APP_ROLES,
  };

  return {
    openapi: "3.0.3",
    info: {
      title: "Crisvia API",
      version: "1.0.0",
      description:
        "API REST de Crisvia (HealthTech / clinical research sites). " +
        "La mayoría de endpoints requieren sesión Supabase vía cookies (`sb-*`). " +
        "Iniciá sesión con `POST /api/auth/login` desde el mismo navegador antes de probar endpoints protegidos en Swagger UI.",
      contact: {
        name: "Crisvia",
      },
    },
    servers: [{ url: baseUrl, description: "Servidor actual" }],
    tags: [
      { name: "Auth", description: "Autenticación y sesión" },
      { name: "Patients", description: "Registro e importación de pacientes" },
      { name: "Protocols", description: "Protocolos clínicos" },
      { name: "Audit", description: "Bitácora CFR Part 11" },
      { name: "RBAC", description: "Roles clínicos" },
      { name: "ICD-11", description: "Terminología WHO ICD-11" },
      { name: "Stripe", description: "Facturación SaaS" },
      { name: "Waitlist", description: "Landing / captación" },
      {
        name: "IWRS",
        description:
          "Retirado como producto de Crisvia. El IRT lo opera un tercero. Estas rutas internas no llaman a Lilly ni a Medidata.",
      },
      {
        name: "ePRO",
        description:
          "Retirado como producto. El ePRO del estudio lo opera un tercero conectado por webhook. No es certificación HIPAA ni 21 CFR Part 11.",
      },
      {
        name: "Follow-up",
        description:
          "Retirado como producto. El calendario de visitas vive en el EDC del tercero.",
      },
      {
        name: "Cierre",
        description:
          "Retirado como producto. Database Lock / CSR los opera el EDC o el biostats del sponsor. Crisvia no envía a FDA/EMA/COFEPRIS.",
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "sb-access-token",
          description:
            "Sesión Supabase SSR (cookies HttpOnly). Usá «Authorize» tras login en /login o probá endpoints desde este mismo origen.",
        },
      },
      schemas: {
        Error: errorSchema,
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "demo@screening.local" },
            password: { type: "string", format: "password", example: "demo123" },
          },
          example: EXAMPLES.login,
        },
        LoginResponse: {
          type: "object",
          properties: {
            email: { type: "string", format: "email" },
          },
        },
        SessionResponse: {
          type: "object",
          properties: {
            authenticated: { type: "boolean" },
            email: { type: "string", nullable: true },
            userId: { type: "string", format: "uuid", nullable: true },
            role: { ...appRoleSchema, nullable: true },
          },
        },
        WaitlistRequest: {
          type: "object",
          required: ["email"],
          properties: {
            email: { type: "string", format: "email" },
            source: { type: "string", example: "landing" },
          },
          example: EXAMPLES.waitlist,
        },
        PatientRow: {
          type: "object",
          required: ["first_name", "last_name", "birth_date", "gender"],
          properties: {
            first_name: { type: "string", maxLength: 120 },
            last_name: { type: "string", maxLength: 120 },
            birth_date: { type: "string", format: "date", example: "1985-03-15" },
            gender: { type: "string", enum: ["male", "female", "other"] },
            phone: { type: "string", maxLength: 40 },
            email: { type: "string", format: "email" },
            ethnicity: {
              type: "string",
              enum: [
                "mestizo",
                "blanco",
                "indigena",
                "afrodescendiente",
                "asiatico",
                "otro",
                "no_informa",
              ],
            },
            subject_code: { type: "string", example: "10001" },
            conditions: { type: "array", items: { type: "string" } },
            medications: { type: "array", items: { type: "string" } },
            laboratories: {
              type: "object",
              additionalProperties: { type: "number" },
            },
          },
        },
        PatientImportRequest: {
          type: "object",
          required: ["patients"],
          properties: {
            patients: {
              type: "array",
              minItems: 1,
              maxItems: 500,
              items: { $ref: "#/components/schemas/PatientRow" },
            },
          },
          example: EXAMPLES.patientImport,
        },
        PatientImportResponse: {
          type: "object",
          properties: {
            imported: { type: "integer" },
            failed: { type: "integer" },
            errors: { type: "array", items: { type: "string" } },
          },
        },
        CustomAuditRequest: {
          type: "object",
          required: ["tableName", "recordId", "description"],
          properties: {
            tableName: {
              type: "string",
              enum: ["patients", "clinical_profiles", "screenings", "protocols"],
            },
            recordId: { type: "string", format: "uuid" },
            description: { type: "string", maxLength: 2000 },
            metadata: { type: "object", additionalProperties: true },
            userId: { type: "string", format: "uuid", nullable: true },
          },
          example: EXAMPLES.audit,
        },
        AuditLog: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            user_id: { type: "string", format: "uuid", nullable: true },
            action: { type: "string", enum: ["INSERT", "UPDATE", "DELETE", "CUSTOM"] },
            table_name: { type: "string" },
            record_id: { type: "string", format: "uuid" },
            old_data: { type: "object", nullable: true },
            new_data: { type: "object", nullable: true },
            created_at: { type: "string", format: "date-time" },
          },
        },
        AssignRoleRequest: {
          type: "object",
          required: ["userId", "role"],
          properties: {
            userId: { type: "string", format: "uuid" },
            role: appRoleSchema,
          },
          example: EXAMPLES.assignRole,
        },
        Icd11SearchResult: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            score: { type: "number" },
          },
        },
        StripeCheckoutRequest: {
          type: "object",
          properties: {
            planId: { type: "string", example: "pro" },
          },
          example: EXAMPLES.stripeCheckout,
        },
      },
    },
    paths: {
      "/api/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Iniciar sesión",
          description: "Autentica con email/contraseña y establece cookies de sesión Supabase.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginRequest" },
                example: EXAMPLES.login,
              },
            },
          },
          responses: {
            "200": {
              description: "Sesión creada",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/LoginResponse" },
                },
              },
            },
            "400": { description: "Datos inválidos", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "401": { description: "Credenciales incorrectas", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "429": { description: "Rate limit excedido", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/api/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Cerrar sesión",
          responses: {
            "200": {
              description: "Sesión cerrada",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { ok: { type: "boolean" } },
                  },
                },
              },
            },
          },
        },
      },
      "/api/auth/session": {
        get: {
          tags: ["Auth"],
          summary: "Estado de sesión",
          description: "Devuelve si hay usuario autenticado y su rol clínico RBAC.",
          responses: {
            "200": {
              description: "Estado actual",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SessionResponse" },
                },
              },
            },
          },
        },
      },
      "/api/waitlist": {
        post: {
          tags: ["Waitlist"],
          summary: "Alta en waitlist (público)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WaitlistRequest" },
                example: EXAMPLES.waitlist,
              },
            },
          },
          responses: {
            "200": {
              description: "Registrado",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { ok: { type: "boolean" } },
                  },
                },
              },
            },
            "409": { description: "Email duplicado", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/api/patients/import": {
        post: {
          tags: ["Patients"],
          summary: "Importar pacientes (JSON)",
          description: "Requiere permiso `patients:write` (coordinator / investigator).",
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PatientImportRequest" },
                example: EXAMPLES.patientImport,
              },
            },
          },
          responses: {
            "200": {
              description: "Resultado de importación",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/PatientImportResponse" },
                },
              },
            },
            "401": { description: "No autenticado", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "403": { description: "Sin permiso", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/api/protocols/extract": {
        post: {
          tags: ["Protocols"],
          summary: "Extraer criterios de protocolo (PDF/TXT + IA)",
          description: "Sube PDF o TXT; GPT-4o-mini devuelve criterios estructurados.",
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["file"],
                  properties: {
                    file: { type: "string", format: "binary" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Borrador extraído" },
            "400": { description: "Archivo inválido", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "403": { description: "Sin permiso", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/api/audit": {
        get: {
          tags: ["Audit"],
          summary: "Consultar bitácora de auditoría",
          security: [{ cookieAuth: [] }],
          parameters: [
            { name: "table_name", in: "query", required: true, schema: { type: "string", enum: ["patients", "clinical_profiles", "screenings", "protocols"] } },
            { name: "record_id", in: "query", required: true, schema: { type: "string", format: "uuid" } },
            { name: "limit", in: "query", schema: { type: "integer", default: 100, maximum: 500 } },
          ],
          responses: {
            "200": {
              description: "Logs",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      logs: { type: "array", items: { $ref: "#/components/schemas/AuditLog" } },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Audit"],
          summary: "Registrar evento de auditoría manual",
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CustomAuditRequest" },
                example: EXAMPLES.audit,
              },
            },
          },
          responses: {
            "201": {
              description: "Evento registrado",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { auditId: { type: "string", format: "uuid" } },
                  },
                },
              },
            },
          },
        },
      },
      "/api/rbac/roles": {
        get: {
          tags: ["RBAC"],
          summary: "Listar miembros y roles clínicos",
          description: "Solo investigator (`roles:manage`).",
          security: [{ cookieAuth: [] }],
          responses: {
            "200": { description: "Miembros con roles" },
            "403": { description: "Sin permiso", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
        put: {
          tags: ["RBAC"],
          summary: "Asignar rol clínico",
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AssignRoleRequest" },
                example: EXAMPLES.assignRole,
              },
            },
          },
          responses: {
            "200": {
              description: "Rol actualizado",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { ok: { type: "boolean" } },
                  },
                },
              },
            },
          },
        },
      },
      "/api/icd11/search": {
        get: {
          tags: ["ICD-11"],
          summary: "Buscar en catálogo ICD-11 (WHO)",
          parameters: [
            { name: "q", in: "query", required: true, schema: { type: "string" }, example: "diabetes" },
          ],
          responses: {
            "200": {
              description: "Resultados",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      results: { type: "array", items: { $ref: "#/components/schemas/Icd11SearchResult" } },
                      names: { type: "array", items: { type: "string" } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/icd11/normalize": {
        get: {
          tags: ["ICD-11"],
          summary: "Normalizar término coloquial a ICD-11",
          parameters: [
            { name: "q", in: "query", required: true, schema: { type: "string" }, example: "presión alta" },
          ],
          responses: {
            "200": { description: "Término normalizado y alternativas" },
          },
        },
      },
      "/api/stripe/checkout": {
        post: {
          tags: ["Stripe"],
          summary: "Crear sesión de checkout",
          security: [{ cookieAuth: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StripeCheckoutRequest" },
                example: EXAMPLES.stripeCheckout,
              },
            },
          },
          responses: {
            "200": {
              description: "URL de Stripe Checkout",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { url: { type: "string", format: "uri" } },
                  },
                },
              },
            },
          },
        },
      },
      "/api/stripe/portal": {
        post: {
          tags: ["Stripe"],
          summary: "Portal de facturación Stripe",
          security: [{ cookieAuth: [] }],
          responses: {
            "200": {
              description: "URL del portal",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { url: { type: "string", format: "uri" } },
                  },
                },
              },
            },
          },
        },
      },
      "/api/webhooks/stripe": {
        post: {
          tags: ["Stripe"],
          summary: "Webhook Stripe (servidor a servidor)",
          description: "Solo Stripe. Requiere cabecera `Stripe-Signature`.",
          parameters: [
            {
              name: "Stripe-Signature",
              in: "header",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { type: "object", additionalProperties: true },
              },
            },
          },
          responses: {
            "200": { description: "Evento procesado" },
            "400": { description: "Firma inválida", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/api/iwrs": {
        get: {
          tags: ["IWRS"],
          summary: "Catálogo del módulo IWRS",
          description:
            "Retirado como producto. El IRT lo opera un tercero. Esta ruta no es el IRT del sponsor.",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "protocol_id",
              in: "query",
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": {
              description: "Catálogo IWRS",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      module: { type: "string", example: "iwrs" },
                      version: { type: "string", example: "1" },
                      configs: { type: "array", items: { type: "object" } },
                      arms: { type: "array", items: { type: "object" } },
                      assignments: { type: "array", items: { type: "object" } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/iwrs/config": {
        post: {
          tags: ["IWRS"],
          summary: "Activar o actualizar IWRS de un protocolo",
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["protocol_id", "enabled", "blinding", "block_size"],
                  properties: {
                    protocol_id: { type: "string", format: "uuid" },
                    enabled: { type: "boolean" },
                    blinding: { type: "string", enum: ["open", "single", "double"] },
                    block_size: { type: "integer", minimum: 2, maximum: 24 },
                    stratify_gender: { type: "boolean" },
                    source: { type: "string", enum: ["site", "sponsor"] },
                    sponsor_vendor: { type: "string" },
                    sponsor_study_id: { type: "string" },
                    sponsor_site_id: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Config guardada" },
          },
        },
      },
      "/api/iwrs/arms": {
        post: {
          tags: ["IWRS"],
          summary: "Agregar brazo de randomización",
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["protocol_id", "code", "name"],
                  properties: {
                    protocol_id: { type: "string", format: "uuid" },
                    code: { type: "string" },
                    name: { type: "string" },
                    allocation_weight: { type: "integer", minimum: 1, maximum: 9 },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Brazo creado" },
          },
        },
      },
      "/api/iwrs/randomize": {
        post: {
          tags: ["IWRS"],
          summary: "Asignar kit (retirado)",
          description:
            "Retirado. La randomización la confirma el IWRS del sponsor; el coordinador marca Randomizado en el tracker.",
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["screening_id"],
                  properties: {
                    screening_id: { type: "string", format: "uuid" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Asignación" },
            "400": { description: "Protocolo sponsor o IWRS inactivo", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/api/iwrs/sponsor-register": {
        post: {
          tags: ["IWRS"],
          summary: "Registrar kit del IRT del sponsor",
          description: "Crisvia no llama a Lilly ni a IQVIA. El coordinador carga el kit que ya devolvió ese IRT.",
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["screening_id", "kit_code"],
                  properties: {
                    screening_id: { type: "string", format: "uuid" },
                    kit_code: { type: "string" },
                    external_id: { type: "string" },
                    arm_id: { type: "string", format: "uuid", nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Kit registrado" },
          },
        },
      },
      "/api/iwrs/unblind": {
        post: {
          tags: ["IWRS"],
          summary: "Desenmascarar asignación",
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["randomization_id", "reason"],
                  properties: {
                    randomization_id: { type: "string", format: "uuid" },
                    reason: { type: "string", minLength: 8 },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Brazo visible" },
          },
        },
      },
      "/api/epro-app/invite": {
        post: {
          tags: ["ePRO"],
          summary: "Generar invitación ePRO (retirado)",
          description:
            "Retirado como producto. El ePRO del estudio invita al sujeto; Crisvia no hospeda /epro-app.",
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["patient_id"],
                  properties: { patient_id: { type: "string", format: "uuid" } },
                },
              },
            },
          },
          responses: {
            "200": { description: "URL /epro-app/activar/{token}" },
            "403": { description: "Monitor u otro rol de solo lectura" },
          },
        },
      },
      "/api/epro-app/p/activar": {
        post: {
          tags: ["ePRO"],
          summary: "Activar PIN del sujeto",
          description: "Año de nacimiento + PIN de 6 dígitos. No devuelve PII.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["token", "birth_year", "pin"],
                  properties: {
                    token: { type: "string" },
                    birth_year: { type: "string", pattern: "^\\d{4}$" },
                    pin: { type: "string", pattern: "^\\d{6}$" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Sesión HttpOnly, subject_code" },
          },
        },
      },
      "/api/epro-app/p/login": {
        post: {
          tags: ["ePRO"],
          summary: "Login ePRO (código de sujeto + PIN)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["subject_code", "pin"],
                  properties: {
                    subject_code: { type: "string", pattern: "^[0-9]{4,12}$" },
                    pin: { type: "string", pattern: "^\\d{6}$" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Sesión de 3 minutos de inactividad" },
            "403": { description: "Código o PIN incorrectos" },
          },
        },
      },
      "/api/epro-app/p/hoy": {
        get: {
          tags: ["ePRO"],
          summary: "Cuestionario del día (UTC)",
          description: "Si ya contestó, completed=true. Cookie epro-session.",
          responses: {
            "200": { description: "Preguntas o completado" },
            "401": { description: "Sesión vencida" },
          },
        },
        post: {
          tags: ["ePRO"],
          summary: "Guardar respuestas del día",
          description: "INSERT inmutable + bitácora (acción, valor, UTC, subject_code).",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["answers"],
                  properties: {
                    answers: { type: "object", additionalProperties: true },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Guardado" },
            "409": { description: "Cuestionario completado por hoy" },
          },
        },
      },
      "/api/follow-up/calendario": {
        get: {
          tags: ["Follow-up"],
          summary: "Calendario del protocolo",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "protocol_id",
              in: "query",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: { "200": { description: "Visitas del calendario" } },
        },
        post: {
          tags: ["Follow-up"],
          summary: "Agregar visita al calendario",
          security: [{ cookieAuth: [] }],
          responses: { "200": { description: "Visita creada" } },
        },
      },
      "/api/follow-up/generar": {
        post: {
          tags: ["Follow-up"],
          summary: "Generar visitas del sujeto",
          description: "Día 0 = IWRS o primera dosis. Copia la ventana al momento de generar.",
          security: [{ cookieAuth: [] }],
          responses: { "200": { description: "Calendario generado" } },
        },
      },
      "/api/follow-up/completar": {
        post: {
          tags: ["Follow-up"],
          summary: "Completar visita de seguimiento",
          description:
            "Signos vitales obligatorios. Fuera de ventana → status out_of_window y protocol_deviation.",
          security: [{ cookieAuth: [] }],
          responses: {
            "200": { description: "Guardado" },
            "409": { description: "Ya no está programada" },
          },
        },
      },
      "/api/cierre": {
        get: {
          tags: ["Cierre"],
          summary: "Estado de cierre",
          description:
            "Sin protocol_id lista protocolos. Con protocol_id: fase, escaneo de limpieza y queries.",
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              name: "protocol_id",
              in: "query",
              required: false,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: { "200": { description: "Estado o listado" } },
        },
      },
      "/api/cierre/query": {
        post: {
          tags: ["Cierre"],
          summary: "Abrir query de limpieza",
          description: "Monitor CRA (o el centro) pide un dato faltante o una justificación.",
          security: [{ cookieAuth: [] }],
          responses: { "200": { description: "Query abierta" } },
        },
      },
      "/api/cierre/lock": {
        post: {
          tags: ["Cierre"],
          summary: "Database Lock",
          description:
            "Irreversible. Exige escaneo limpio y declaración ≥20 caracteres. Solo PI/sub.",
          security: [{ cookieAuth: [] }],
          responses: {
            "200": { description: "Base congelada" },
            "409": { description: "Datos incompletos o ya bloqueada" },
          },
        },
      },
      "/api/cierre/unblind": {
        post: {
          tags: ["Cierre"],
          summary: "Apertura del ciego del estudio",
          description:
            "Solo después del lock. Distinto de POST /api/iwrs/unblind (emergencia de un sujeto).",
          security: [{ cookieAuth: [] }],
          responses: { "200": { description: "Ciego abierto" } },
        },
      },
      "/api/cierre/analizar": {
        post: {
          tags: ["Cierre"],
          summary: "Snapshot descriptivo",
          description: "n/brazo, EA, adherencia. No es SAS/R ni significancia estadística.",
          security: [{ cookieAuth: [] }],
          responses: { "200": { description: "Snapshot guardado" } },
        },
      },
      "/api/cierre/csr": {
        post: {
          tags: ["Cierre"],
          summary: "CSR del centro",
          description: "Borrador markdown. No es el CSR oficial del sponsor.",
          security: [{ cookieAuth: [] }],
          responses: { "200": { description: "Markdown generado" } },
        },
      },
      "/api/cierre/someter": {
        post: {
          tags: ["Cierre"],
          summary: "Registrar sometimiento",
          description:
            "Constancia de paquete para FDA/EMA/COFEPRIS/ANMAT. Crisvia no envía a las agencias.",
          security: [{ cookieAuth: [] }],
          responses: { "200": { description: "Registrado" } },
        },
      },
    },
  };
}
