# Screenlane

Plataforma **HealthTech** para **clinical research sites**. Optimiza el **pre-screening**, el **matching** paciente–protocolo y el **re-matching** cuando un paciente cae en screen failure — con portal de candidatos, trazabilidad clínica, RBAC y asistente IA.

[![Next.js](https://img.shields.io/badge/Next.js-16-000?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)
[![Stripe](https://img.shields.io/badge/Stripe-SaaS-635BFF?style=flat&logo=stripe&logoColor=white)](https://stripe.com/)

---

## Qué nos diferencia

Screenlane no compite como un módulo aislado de “AI sobre EHR”. Es el **funnel operativo completo del clinical research site** en un solo producto SaaS accesible.

| Diferencial | Qué significa en la práctica |
|-------------|------------------------------|
| **Funnel end-to-end** | Pacientes, protocolos, matching, tracker Kanban, re-match, portal público y facturación — sin Excel ni herramientas sueltas |
| **Re-Match nativo** | Tras un screen failure, propone automáticamente otros protocolos activos donde el paciente podría encajar |
| **Dos audiencias** | Coordinadores (app clínica) y pacientes (pre-registro en `/candidato` con link del centro) |
| **Matching explicable** | Motor de reglas con semáforo 🟢🟡🔴 + detalle criterio por criterio + **justificación clínica IA** que narra el resultado sin cambiar la elegibilidad |
| **IA con herramientas reales** | LangGraph + MCP: buscar pacientes, matchear protocolos, screen failures e ICD-11 — no solo chat genérico |
| **RBAC + audit trail** | Roles clínicos (investigator, sub-investigator, coordinator, monitor) y bitácora orientada a 21 CFR Part 11 |
| **LATAM-first, sin EHR obligatorio** | UI en español; el MVP funciona con registro manual y portal — ideal para sitios que arrancan sin integración hospitalaria |
| **SaaS self-serve** | Trial 14 días, planes por volumen y Stripe — pensado para sitios medianos, no solo enterprise |

**En una frase:** del candidato al protocolo correcto, sin perder pacientes tras un screen failure.

---

## Características principales

| Área | Qué hace |
|------|----------|
| **Patient Registry** | Alta, búsqueda e importación CSV de pacientes |
| **Clinical Profile** | Condiciones, medicación, laboratorios + búsqueda ICD-11 + extracción IA desde notas |
| **Protocol Matcher** | Criterios de inclusión/exclusión; extracción NLP desde PDF |
| **Motor de elegibilidad** | Semáforo 🟢 Cumple / 🟡 Pendiente / 🔴 No cumple + `match_score` + justificación IA |
| **Screening Tracker** | Kanban: Pre-screening → Screening → Randomización → Screen Failure |
| **Re-Match** | Propone protocolos alternativos para pacientes con screen failure |
| **Portal candidatos** | Pre-registro público (`/candidato`) + inbox (`/candidatos`) + settings del portal |
| **Asistente IA** | Chat clínico (LangGraph + GPT-4o-mini) con herramientas MCP |
| **Audit Trail** | Bitácora inmutable alineada a 21 CFR Part 11 |
| **RBAC clínico** | Investigator / Sub-investigator / Coordinator / Monitor |
| **SaaS** | Organizations, trial 14 días, Stripe Checkout + Portal |
| **ePRO** | Formularios electrónicos del paciente (Fase A) |
| **API Docs** | Swagger UI en [`/docs/api`](http://localhost:3000/docs/api) |

---

## Stack tecnológico

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend / DB:** Supabase (PostgreSQL, Auth SSR, Row Level Security)
- **IA:** OpenAI GPT-4o-mini, LangGraph, Vercel AI SDK, MCP (screening + ICD-11)
- **Pagos:** Stripe (suscripciones)
- **Validación:** Zod
- **Docs API:** OpenAPI 3.0 + Swagger UI

---

## Módulos de la aplicación

| Ruta | Descripción |
|------|-------------|
| `/dashboard` | Embudo de screening y métricas del site |
| `/patients` | Registro de pacientes |
| `/patients/[id]` | Perfil clínico + timeline de auditoría |
| `/protocols` | Gestión de protocolos |
| `/protocols/[id]/match` | Cruce masivo paciente ↔ protocolo + justificación IA |
| `/tracker` | Pipeline Kanban con drag & drop |
| `/rematch` | Re-matching automático post screen failure |
| `/candidato` | Portal público de pre-registro (pacientes) |
| `/candidatos` | Inbox de leads del portal (coordinadores) |
| `/settings/portal` | Configuración del portal (investigator) |
| `/chat` | Asistente clínico IA |
| `/epro` | Formularios ePRO |
| `/settings/roles` | Creación de usuarios y roles (investigator) |
| `/account/billing` | Plan, trial y facturación Stripe |
| `/docs` | Documentación del producto |
| `/docs/api` | Swagger UI (REST API) |

---

## Inicio rápido

### Requisitos

- Node.js 20+
- Cuenta en [Supabase](https://supabase.com)
- (Opcional) OpenAI, Stripe, credenciales WHO ICD-11

### 1. Clonar e instalar

```bash
git clone https://github.com/julio14-byte/Screening-intel.git
cd Screening-intel
yarn install
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Mínimo para desarrollo:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # creación de usuarios demo / admin / portal
NEXT_PUBLIC_APP_URL=http://localhost:3000
OPENAI_API_KEY=sk-...                     # chat IA, extracción PDF/notas, justificación matching
```

Ver [`.env.example`](.env.example) para Stripe, ICD-11 y login demo. Guía Stripe: [`docs/STRIPE_SETUP.md`](docs/STRIPE_SETUP.md).

### 3. Base de datos (Supabase)

Ejecutá las migraciones **en orden** en el SQL Editor o con la CLI:

```text
supabase/migrations/0001_initial_schema.sql
supabase/migrations/0002_profiles_saas_fase1.sql
supabase/migrations/0003_waitlist_ai_metrics.sql
supabase/migrations/0004_mvp_clinical_rls.sql
supabase/migrations/0005_epro_phase_a.sql
supabase/migrations/0006_audit_trail.sql
supabase/migrations/0007_rbac.sql
supabase/migrations/0009_patient_portal.sql
supabase/migrations/0010_sub_investigator.sql      ← ejecutar solo (enum)
supabase/migrations/0012_sub_investigator_rbac.sql ← después de 0010
supabase/migrations/0013_portal_public_read.sql
supabase/migrations/0014_fix_protocols_portal_grants.sql
```

Si el slug `demo` falló en 0009, aplicá también `0011_fix_organization_slug_backfill.sql`.

Opcional — datos de demo o activar Pro sin Stripe:

```bash
# supabase/seed.sql o supabase/scripts/upgrade_org_to_pro.sql
```

Con Supabase CLI:

```bash
supabase link
supabase db push
```

### 4. Arrancar

```bash
yarn dev
```

| URL | Uso |
|-----|-----|
| http://localhost:3000 | Landing |
| http://localhost:3000/login | Login |
| http://localhost:3000/candidato | Portal pacientes |
| http://localhost:3000/docs/api | Swagger UI |

**Usuario demo** (auto-provisión si existe `SUPABASE_SERVICE_ROLE_KEY`):

- Email: `demo@screening.local`
- Password: `demo123`

---

## Motor de matching

La lógica central está en [`src/lib/matching.ts`](src/lib/matching.ts):

- **🟢 Cumple** — inclusión OK, sin exclusiones activas
- **🟡 Pendiente** — falta perfil clínico o laboratorio requerido
- **🔴 No cumple** — falla inclusión o activa exclusión

Cada screening guarda `match_score` (0–100) y `match_details` (trazabilidad criterio por criterio).

**Justificación clínica (IA):** en matching y re-match, `POST /api/matching/rationale` genera un texto en español que explica el veredicto usando solo esos datos — **sin modificar la elegibilidad**.

---

## Inteligencia artificial

| Funcionalidad | Ruta / API | Modelo |
|---------------|------------|--------|
| Chat clínico | `/chat` · `POST /api/auth/chats` | GPT-4o-mini + LangGraph |
| Extracción de protocolos PDF | `POST /api/protocols/extract` | GPT-4o-mini |
| Perfil clínico desde notas | `POST /api/patients/profile/extract` | GPT-4o-mini |
| Justificación del matching | `POST /api/matching/rationale` | GPT-4o-mini |
| Normalización ICD-11 | `GET /api/icd11/normalize` | API WHO (no LLM) |
| Matching / Re-Match | Motor de reglas | Sin LLM |

Servidores MCP locales (opcional):

```bash
yarn mcp:screening
yarn mcp:icd11
```

---

## RBAC clínico

| Rol | Permisos |
|-----|----------|
| **investigator** | Protocolos, aprobaciones, randomización, gestión de roles y facturación |
| **sub_investigator** | Igual que PI en clínica; sin roles ni billing |
| **coordinator** | Pacientes, screening operativo (sin marcar Apto) |
| **monitor** | Solo lectura (CRA / auditoría farmacéutica) |

Administración en `/settings/roles` (solo investigator).

```typescript
import { requirePermission } from "@/lib/rbac/require-permission";

const { user, role } = await requirePermission("screenings:approve");
```

---

## Audit Trail (21 CFR Part 11)

- Tabla `audit_logs` **append-only**
- Triggers automáticos en `patients` (UPDATE / DELETE)
- RPC `record_custom_audit_event` para eventos manuales
- UI: `<AuditTimeline />` en `/patients/[id]`

Migración: `0006_audit_trail.sql`

---

## API REST

Documentación interactiva:

- **Swagger UI:** `/docs/api`
- **OpenAPI JSON:** `/api/openapi`

Endpoints públicos principales:

```http
POST /api/auth/login
POST /api/waitlist
GET  /api/openapi
POST /api/candidato/enviar
```

El resto requiere sesión Supabase (cookies).

---

## SaaS y Stripe

- Trial 14 días por organization
- Planes **Free**, **Pro** y **Pro+** (`src/config.ts`)
- Webhook: `POST /api/webhooks/stripe`

Variables: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PRO`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`.

Detalle: [`docs/STRIPE_SETUP.md`](docs/STRIPE_SETUP.md).

---

## Deploy en Vercel

1. Importá el repositorio en [Vercel](https://vercel.com).
2. Configurá las variables de `.env.example`.
3. Webhook Stripe → `https://tu-dominio/api/webhooks/stripe`
4. `NEXT_PUBLIC_APP_URL` → URL de producción

```bash
yarn build
```

---

## Estructura del proyecto

```text
supabase/
  migrations/     # Esquema SQL, RLS, RBAC, portal, audit
  seed.sql        # Datos de demo
  scripts/        # Utilidades (ej. upgrade_org_to_pro.sql)
src/
  app/            # App Router (páginas + API routes)
  actions/        # Server Actions
  components/     # UI por módulo
  lib/
    matching.ts              # Motor de elegibilidad (reglas)
    matching/                # Justificación IA del matching
    rbac/                    # Permisos y roles
    audit/                   # Audit trail
    agents/                  # LangGraph + MCP
    candidato/               # Portal público
    openapi/                 # Spec OpenAPI
  plugins/stripe/            # Checkout, portal, paywall
mcp/                         # Servidores MCP (screening, icd11)
docs/                        # STRIPE_SETUP.md, etc.
```

---

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `yarn dev` | Servidor de desarrollo |
| `yarn build` | Build de producción |
| `yarn start` | Servidor de producción |
| `yarn lint` | ESLint |
| `yarn mcp:screening` | MCP servidor screening |
| `yarn mcp:icd11` | MCP servidor ICD-11 |

---

## Seguridad

- Autenticación Supabase SSR con middleware
- RLS en PostgreSQL + RBAC clínico
- Validación Zod en APIs críticas
- Portal público con rate limiting y políticas RLS dedicadas

Antes de producción con datos reales de pacientes: revisá políticas RLS, rotá claves y completá evaluación de cumplimiento (HIPAA / GDPR según jurisdicción).

---

## Contribuir

1. Fork del repositorio
2. Branch: `cursor/tu-feature-4921`
3. Commit descriptivo
4. Pull Request contra `main`

---

## Autor

Desarrollado por [**julio14-byte**](https://github.com/julio14-byte) — Screenlane para clinical research sites.
