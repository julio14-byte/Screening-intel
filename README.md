# Screenlane

Plataforma **HealthTech** para **research sites** y clínicas de investigación. Optimiza el **pre-screening**, el **matching** paciente–protocolo y el **re-matching** cuando un paciente cae en screen failure — con trazabilidad clínica, RBAC y asistente IA.

[![Next.js](https://img.shields.io/badge/Next.js-16-000?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)
[![Stripe](https://img.shields.io/badge/Stripe-SaaS-635BFF?style=flat&logo=stripe&logoColor=white)](https://stripe.com/)

---

## Características principales

| Área | Qué hace |
|------|----------|
| **Patient Registry** | Alta, búsqueda e importación CSV de pacientes |
| **Clinical Profile** | Condiciones, medicación, laboratorios + búsqueda ICD-11 |
| **Protocol Matcher** | Criterios de inclusión/exclusión; extracción NLP desde PDF |
| **Motor de elegibilidad** | Semáforo 🟢 Cumple / 🟡 Pendiente / 🔴 No cumple + `match_score` |
| **Screening Tracker** | Kanban: Pre-screening → Screening → Randomización → Screen Failure |
| **Re-Match** | Propone protocolos alternativos para pacientes con screen failure |
| **Asistente IA** | Chat clínico (LangGraph + GPT-4o-mini) con herramientas MCP |
| **Audit Trail** | Bitácora inmutable alineada a 21 CFR Part 11 |
| **RBAC clínico** | Investigator / Coordinator / Monitor |
| **SaaS** | Organizations, trial 14 días, Stripe Checkout + Portal |
| **ePRO** | Formularios electrónicos del paciente (Fase A) |
| **API Docs** | Swagger UI en [`/docs/api`](http://localhost:3000/docs/api) |

---

## Stack tecnológico

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend / DB:** Supabase (PostgreSQL, Auth SSR, Row Level Security)
- **IA:** OpenAI, LangGraph, Vercel AI SDK, MCP (screening + ICD-11)
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
| `/protocols/[id]/match` | Cruce masivo paciente ↔ protocolo |
| `/tracker` | Pipeline Kanban con drag & drop |
| `/rematch` | Re-matching automático post screen failure |
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
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Mínimo para desarrollo:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # creación de usuarios demo / admin
NEXT_PUBLIC_APP_URL=http://localhost:3000
OPENAI_API_KEY=sk-...                     # chat IA + extracción PDF
```

Ver [`.env.example`](.env.example) para Stripe, ICD-11 y login demo.

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
```

Opcional — datos de demo:

```bash
# supabase/seed.sql en el SQL Editor
```

Con Supabase CLI:

```bash
supabase link
supabase db push
```

### 4. Arrancar

```bash
npm run dev
```

| URL | Uso |
|-----|-----|
| http://localhost:3000 | Landing |
| http://localhost:3000/login | Login |
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

---

## Inteligencia artificial

| Funcionalidad | Ruta / API | Modelo |
|---------------|------------|--------|
| Chat clínico | `/chat` · `POST /api/auth/chats` | GPT-4o-mini + LangGraph |
| Extracción de protocolos PDF | `POST /api/protocols/extract` | GPT-4o-mini |
| Normalización ICD-11 | `GET /api/icd11/normalize` | API WHO (no LLM) |

Servidores MCP locales (opcional):

```bash
npm run mcp:screening
npm run mcp:icd11
```

---

## RBAC clínico

| Rol | Permisos |
|-----|----------|
| **investigator** | Protocolos, aprobaciones, randomización, gestión de roles y facturación |
| **sub_investigator** | Igual que PI en clínica (protocolos, randomización, aprobaciones); sin roles ni billing |
| **coordinator** | Pacientes, screening operativo (sin marcar Apto) |
| **monitor** | Solo lectura (CRA / auditoría farmacéutica) |

Administración en `/settings/roles` (solo investigator). Migración: `0007_rbac.sql`.

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
```

El resto requiere sesión Supabase (cookies).

---

## SaaS y Stripe

- Trial 14 días por organization
- Planes **Starter** y **Site Pro** (`src/config.ts`)
- Webhook: `POST /api/webhooks/stripe`

Variables: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PRO`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

---

## Deploy en Vercel

1. Importá el repositorio en [Vercel](https://vercel.com).
2. Configurá las variables de `.env.example`.
3. Webhook Stripe → `https://tu-dominio/api/webhooks/stripe`
4. `NEXT_PUBLIC_APP_URL` → URL de producción

```bash
npm run build
```

---

## Estructura del proyecto

```text
supabase/
  migrations/     # Esquema SQL, RLS, triggers, RBAC, audit
  seed.sql        # Datos de demo
src/
  app/            # App Router (páginas + API routes)
  actions/        # Server Actions
  components/     # UI por módulo (patients, protocols, tracker…)
  lib/
    matching.ts   # Motor de elegibilidad
    rbac/         # Permisos y roles
    audit/        # Audit trail
    agents/       # LangGraph + MCP
    openapi/      # Spec OpenAPI
  plugins/stripe/ # Checkout, portal, paywall
mcp/              # Servidores MCP (screening, icd11)
```

---

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | ESLint |
| `npm run mcp:screening` | MCP servidor screening |
| `npm run mcp:icd11` | MCP servidor ICD-11 |

---

## Seguridad

- Autenticación Supabase SSR con middleware
- RLS en PostgreSQL + RBAC clínico (`0007_rbac.sql`)
- Validación Zod en APIs críticas
- Rate limiting en middleware (login, import, waitlist…)
- Cabeceras HTTP / CSP (branch `cursor/security-hardening-4921`)

Antes de producción con datos reales de pacientes: revisá políticas RLS, rotá claves y completá evaluación de cumplimiento (HIPAA / GDPR según jurisdicción).

---

## Contribuir

1. Fork del repositorio
2. Branch: `cursor/tu-feature-4921`
3. Commit descriptivo
4. Pull Request contra `main`

---

## Autor

Desarrollado por [**julio14-byte**](https://github.com/julio14-byte) — Screening Intelligence para research sites.
