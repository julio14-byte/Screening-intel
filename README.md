# Crisvia

Plataforma **HealthTech** para **clinical research sites**. Optimiza el **pre-screening**, el **matching** paciente–protocolo y el **re-matching** cuando un paciente cae en screen failure — con portal de candidatos, expediente interno, trazabilidad clínica y RBAC.

[![Next.js](https://img.shields.io/badge/Next.js-16-000?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)
[![Stripe](https://img.shields.io/badge/Stripe-SaaS-635BFF?style=flat&logo=stripe&logoColor=white)](https://stripe.com/)

---

## Novedades recientes

| Feature | Descripción |
|---------|-------------|
| **Expediente interno** | Pacientes, perfil clínico y tablas FHIR propias. Alta manual o CSV. Sin conexión a un EHR hospitalario. |
| **MFA TOTP** | Obligatorio en producción para investigator y sub-investigator (`/settings/security`, `/login/mfa`). |
| **Sesión** | Timeout de inactividad (30 min) y tope absoluto (8 h); login demo apagado en production. |
| **Backups** | Procedimiento de restore PITR en [`docs/BACKUP.md`](docs/BACKUP.md). |
| **Justificación clínica IA** | Texto en español que explica el veredicto del matching sin alterar la elegibilidad (`POST /api/matching/rationale`). |
| **Portal de candidatos** | Pre-registro público en `/candidato`, inbox en `/candidatos` y settings en `/settings/portal`. |
| **Re-Match nativo** | Propone protocolos alternativos tras un screen failure. |
| **Sub-investigator** | Rol clínico con permisos de PI excepto roles y facturación. |
| **Crisvia** | Nombre del producto (antes Screenlane / Screening Intelligence). |
| **Visitas con notas** | Cada consulta con el médico queda registrada (tipo, sede, estado y nota clínica). |

---

## Qué nos diferencia

Crisvia no compite como un módulo aislado de IA clínica. Es el **funnel operativo completo del clinical research site** en un solo producto SaaS accesible.

| Diferencial | Qué significa en la práctica |
|-------------|------------------------------|
| **Funnel end-to-end** | Pacientes, protocolos, matching, tracker Kanban, re-match, portal público y facturación — sin Excel ni herramientas sueltas |
| **Re-Match nativo** | Tras un screen failure, propone automáticamente otros protocolos activos donde el paciente podría encajar |
| **Dos audiencias** | Coordinadores (app clínica) y pacientes (pre-registro en `/candidato` con link del centro) |
| **Matching explicable** | Motor de reglas con semáforo 🟢🟡🔴 + detalle criterio por criterio + **justificación clínica IA** que narra el resultado sin cambiar la elegibilidad |
| **IA puntual** | Justificación del matching, extracción de PDF y notas. No decide elegibilidad. |
| **RBAC + audit trail** | Roles clínicos (investigator, sub-investigator, coordinator, monitor) y bitácora orientada a 21 CFR Part 11 |
| **LATAM-first** | UI en español; expediente interno (manual, CSV, portal). Sin EHR hospitalario. |
| **SaaS self-serve** | Trial 14 días, planes por volumen y Stripe — pensado para sitios medianos, no solo enterprise |

**En una frase:** del candidato al protocolo correcto, sin perder pacientes tras un screen failure.

---

## Características principales

| Área | Qué hace |
|------|----------|
| **Patient Registry** | Alta, búsqueda e importación CSV de pacientes |
| **Clinical Profile** | Condiciones, medicación, laboratorios + búsqueda ICD-11 + extracción IA desde notas |
| **Protocol Matcher** | Criterios de inclusión/exclusión; extracción NLP desde PDF |
| **Motor de elegibilidad** | Semáforo 🟢 Cumple / 🟡 Pendiente / 🔴 No cumple + `match_score` + justificación IA. No es un sorteo: filtra por criterios. |
| **Screening Tracker** | Kanban: Pre-screening → Screening → Randomización → Screen Failure. Con IWRS activo, Randomizado se asigna en `/iwrs`, no arrastrando. |
| **IWRS** | Randomización de sitio **o** registro del kit del IRT del sponsor (Lilly/IQVIA/Suvoda/etc.). No hay API pública única de Lilly. |
| **Re-Match** | Propone protocolos alternativos para pacientes con screen failure |
| **Portal candidatos** | Pre-registro público (`/candidato`) + inbox (`/candidatos`) + settings del portal |
| **Expediente interno** | Pacientes y perfil clínico en tablas de la app (incluye modelo FHIR Patient) |
| **Cola de trabajo** | Tareas de inbox, criterios 🟡 y re-match |
| **Inventario / receta** | Lotes de la farmacéutica por protocolo; la receta electrónica descuenta stock |
| **Dispensación / diario** | Farmacia entrega la caja IWRS, registra la primera dosis y el paciente anota toma/síntomas en `/diario` (link, no una app aparte) |
| **Audit Trail** | Bitácora inmutable alineada a 21 CFR Part 11 |
| **RBAC clínico** | Investigator / Sub-investigator / Coordinator / Monitor |
| **SaaS** | Organizations, trial 14 días, Stripe Checkout + Portal |
| **ePRO** | Formularios electrónicos del paciente (Fase A) |
| **API Docs** | Swagger UI en [`/docs/api`](http://localhost:3000/docs/api) |

---

## Stack tecnológico

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend / DB:** Supabase (PostgreSQL, Auth SSR, Row Level Security)
- **IA:** OpenAI GPT-4o-mini (extracción y justificación), MCP (screening + ICD-11)
- **Pagos:** Stripe (suscripciones)
- **Validación:** Zod
- **Docs API:** OpenAPI 3.0 + Swagger UI

---

## Módulos de la aplicación

| Ruta | Descripción |
|------|-------------|
| `/dashboard` | Embudo de screening y métricas del site |
| `/patients` | Registro de pacientes |
| `/patients/[id]` | Perfil clínico, visitas con notas, receta, IWRS y diario |
| `/protocols` | Gestión de protocolos |
| `/protocols/[id]` | Medicamentos del estudio y números de lote |
| `/protocols/[id]/match` | Cruce masivo paciente ↔ protocolo + justificación IA |
| `/inventario` | Stock de lotes y recetas entregadas |
| `/iwrs` | Randomización de sitio o registro del kit del IRT del sponsor |
| `/dispensacion` | Entrega de caja IWRS, primera dosis y link del diario |
| `/diario/[token]` | Diario público del paciente (hora de toma y síntomas) |
| `/tracker` | Pipeline Kanban con drag & drop |
| `/rematch` | Re-matching automático post screen failure |
| `/candidato` | Portal público de pre-registro (pacientes) |
| `/candidatos` | Inbox de leads del portal (coordinadores) |
| `/cola` | Tareas guardadas: inbox, criterios 🟡 y re-match |
| `/avisos` | Avisos de candidato nuevo, screen failure y tarea vencida |
| `/agenda` | Visitas con el médico: registro, estado y notas clínicas |
| `/settings/portal` | Configuración del portal (investigator) |
| `/settings/security` | MFA TOTP (obligatorio en prod para PI / sub-PI) |
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
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # demo, portal, operaciones de servidor
NEXT_PUBLIC_APP_URL=http://localhost:3000
OPENAI_API_KEY=sk-...                     # extracción PDF/notas, justificación matching
```

Ver [`.env.example`](.env.example) para Stripe, ICD-11, MFA/sesión y login demo. Guías: [`docs/STRIPE_SETUP.md`](docs/STRIPE_SETUP.md), [`docs/BACKUP.md`](docs/BACKUP.md).

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
supabase/migrations/0015_ehr_integration.sql
supabase/migrations/0016_reduce_rls_disk_io.sql
supabase/migrations/0017_secure_patient_data.sql
supabase/migrations/0018_tenant_rls_portal_sites.sql
supabase/migrations/0019_operations_modules.sql
supabase/migrations/20260923230029_ehr_patient_fhir.sql
supabase/migrations/20260923230827_fix_ops_organization_id.sql
supabase/migrations/20260923234047_drop_external_ehr.sql
supabase/migrations/20260923235512_drop_queue_agent_and_patient_ehr.sql
supabase/migrations/20260924001000_protocol_medication_inventory.sql
supabase/migrations/20260924044000_patient_visit_notes.sql
supabase/migrations/20260924053000_repair_ops_visits_schema.sql
supabase/migrations/20260924120000_clinical_anamnesis.sql
supabase/migrations/20260924140000_patient_demographics.sql
supabase/migrations/20260924150000_iwrs_randomization.sql
supabase/migrations/20260925001000_sponsor_iwrs.sql
supabase/migrations/20260925010000_dispense_first_dose_diary.sql
```

Si 0016 falló porque no existía `get_user_organization_ids()`, 0018 la crea y recrea las políticas tenant. Si el slug `demo` falló en 0009, aplica también `0011_fix_organization_slug_backfill.sql`.

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

**Usuario demo** (solo desarrollo; en production está apagado salvo `ALLOW_DEMO_LOGIN=true`):

- Email: `demo@screening.local`
- Password: `demo123`

---

## Motor de matching

La lógica central está en [`src/lib/matching.ts`](src/lib/matching.ts):

- **🟢 Cumple** — inclusión OK, sin exclusiones activas
- **🟡 Pendiente** — falta perfil clínico o laboratorio requerido
- **🔴 No cumple** — falla inclusión o activa exclusión

Cada screening guarda `match_score` (0–100) y `match_details` (trazabilidad criterio por criterio).

**Justificación clínica (IA):** en matching y re-match, `POST /api/matching/rationale` genera un texto en español que explica el veredicto usando solo esos datos — **sin modificar la elegibilidad**. OpenAI recibe iniciales del paciente, no el nombre completo.

---

## Inteligencia artificial

| Funcionalidad | Ruta / API | Modelo |
|---------------|------------|--------|
| Extracción de protocolos PDF | `POST /api/protocols/extract` | GPT-4o-mini |
| Perfil clínico desde notas | `POST /api/patients/profile/extract` | GPT-4o-mini |
| Justificación del matching | `POST /api/matching/rationale` | GPT-4o-mini |
| Normalización ICD-11 | `GET /api/icd11/normalize` | API WHO (no LLM) |
| Matching / Re-Match | Motor de reglas | Sin LLM |

Servidores MCP locales (opcional). El de screening **exige** el UUID del centro:

```bash
CRISVIA_ORGANIZATION_ID=<uuid-del-centro> yarn mcp:screening
yarn mcp:icd11
```

---

## RBAC clínico

| Rol | Permisos |
|-----|----------|
| **investigator** | Protocolos, IWRS (config + desenlace), aprobaciones, gestión de roles y facturación |
| **sub_investigator** | Igual que PI en clínica; sin roles ni billing |
| **coordinator** | Pacientes, screening operativo, randomizar IWRS, dispensar caja y generar diario (sin marcar Apto a mano ni desenmascarar) |
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
POST /api/webhooks/stripe
```

El resto requiere sesión Supabase (cookies).

---

## Expediente interno

No hay conexión con un EHR hospitalario. Los pacientes se ingresan a mano, por CSV o por el portal. El chart vive en las tablas de la app (`patients`, `clinical_profiles`, `conditions`, `observations`, etc.).

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
3. Webhooks:
   - Stripe → `https://tu-dominio/api/webhooks/stripe`
4. `NEXT_PUBLIC_APP_URL` → URL de producción
5. **Authentication → MFA** → Enable TOTP (si no, investigator/sub-PI no pueden enrolar)
6. **Database → Backups** → activá PITR en Pro (ver [`docs/BACKUP.md`](docs/BACKUP.md))
7. No definas `ALLOW_DEMO_LOGIN=true` en el proyecto de producción

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
    candidato/               # Portal público
    openapi/                 # Spec OpenAPI
  plugins/stripe/            # Checkout, portal, paywall
mcp/                         # Servidores MCP (screening, icd11)
docs/                        # STRIPE_SETUP.md, BACKUP.md, etc.
```

---

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `yarn dev` | Servidor de desarrollo |
| `yarn build` | Build de producción |
| `yarn start` | Servidor de producción |
| `yarn lint` | ESLint |
| `yarn mcp:screening` | MCP servidor screening (`CRISVIA_ORGANIZATION_ID` obligatorio) |
| `yarn mcp:icd11` | MCP servidor ICD-11 |

---

## Seguridad

- Autenticación Supabase SSR con middleware
- **Next.js 16.3.5** (parche de RCE de agosto 2026: Image Optimization / AVIF y Windows; cache de imágenes vacías)
- **MFA TOTP** obligatorio en producción para investigator y sub-investigator (activar TOTP en Authentication → MFA)
- Sesión: 30 min de inactividad y 8 h absolutas (`AUTH_IDLE_MINUTES`, `AUTH_SESSION_HOURS`); las cookies de `@supabase/ssr` no se usan como único límite
- Login demo (`demo@screening.local`) **deshabilitado** cuando `NODE_ENV=production`, salvo `ALLOW_DEMO_LOGIN=true`
- RLS en PostgreSQL + RBAC clínico: las políticas `using (true)` se eliminan en `0018`; el aislamiento es por `get_user_organization_ids()`
- Validación Zod en APIs críticas
- Portal público con rate limiting, vista `portal_sites` (sin secretos) y `anon` sin `SELECT` sobre `organizations`
- ePRO aislado por centro; bitácora sin acceso `anon`
- Herramientas MCP de screening filtradas por organización; OpenAI recibe iniciales, no nombres

Backups y restore (PITR): [`docs/BACKUP.md`](docs/BACKUP.md).

Antes de producción con datos reales de pacientes: revisá políticas RLS, rotá claves, activá MFA en el dashboard de Auth, configurá PITR en Pro y completá evaluación de cumplimiento (HIPAA / GDPR según jurisdicción).

---

## Contribuir

1. Fork del repositorio
2. Branch: `cursor/tu-feature-4921`
3. Commit descriptivo
4. Pull Request contra `main`

---

## Autor

Desarrollado por [**julio14-byte**](https://github.com/julio14-byte) — Crisvia para clinical research sites.
