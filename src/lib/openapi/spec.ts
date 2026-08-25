import type { OpenAPIV3 } from "openapi-types";

const APP_ROLES = ["investigator", "coordinator", "monitor"];

/** Especificación OpenAPI 3.0 — Screening Intelligence REST API. */
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
      title: "Screening Intelligence API",
      version: "1.0.0",
      description:
        "API REST de Screening Intelligence (HealthTech / research sites). " +
        "La mayoría de endpoints requieren sesión Supabase vía cookies (`sb-*`). " +
        "Iniciá sesión con `POST /api/auth/login` desde el mismo navegador antes de probar endpoints protegidos en Swagger UI.",
      contact: {
        name: "Screening Intelligence",
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
      { name: "AI", description: "Asistente clínico" },
      { name: "Stripe", description: "Facturación SaaS" },
      { name: "Waitlist", description: "Landing / captación" },
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
        },
        PatientRow: {
          type: "object",
          required: ["first_name", "last_name", "birth_date", "gender"],
          properties: {
            first_name: { type: "string", maxLength: 120 },
            last_name: { type: "string", maxLength: 120 },
            birth_date: { type: "string", format: "date", example: "1985-03-15" },
            gender: { type: "string", enum: ["male", "female", "other"] },
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
        },
        ChatRequest: {
          type: "object",
          required: ["messages"],
          properties: {
            conversationId: { type: "string", format: "uuid" },
            messages: {
              type: "array",
              items: { type: "object", additionalProperties: true },
              description: "Mensajes UI (Vercel AI SDK UIMessage[])",
            },
          },
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
      "/api/auth/chats": {
        post: {
          tags: ["AI"],
          summary: "Chat con asistente clínico (streaming)",
          description:
            "Stream de respuesta del agente LangGraph (GPT-4o-mini). Content-Type de respuesta: stream UI message.",
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ChatRequest" },
              },
            },
          },
          responses: {
            "200": { description: "Stream de mensajes del asistente" },
            "401": { description: "No autenticado", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
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
    },
  };
}
