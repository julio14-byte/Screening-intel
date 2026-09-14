# Crisvia

Plataforma **HealthTech** para **clinical research sites**. Optimiza el **pre-screening**, el **matching** paciente–protocolo y el **re-matching** cuando un paciente cae en screen failure — con portal de candidatos, **ETL de PDF/foto** al expediente, trazabilidad clínica, RBAC e IA embebida en el funnel.

[![Next.js](https://img.shields.io/badge/Next.js-16-000?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)
[![Stripe](https://img.shields.io/badge/Stripe-SaaS-635BFF?style=flat&logo=stripe&logoColor=white)](https://stripe.com/)

---

## Novedades recientes

| Feature | Descripción |
|---------|-------------|
| **PDF de lab / foto de receta** | Extract al expediente en `/patients/[id]`: PDF digital o foto JPEG/PNG. `POST /api/patients/profile/extract-document`. Sin conector a EHR. |
| **MFA TOTP** | Obligatorio en producción para investigator y sub-investigator (`/settings/security`, `/login/mfa`). |
| **Sesión** | Timeout de inactividad (30 min) y tope absoluto (8 h); login demo apagado en production. |
| **Backups** | Procedimiento de restore PITR en [`docs/BACKUP.md`](docs/BACKUP.md). |
| **Triage IA de candidatos** | Briefing para la llamada de pre-screening desde el inbox (`POST /api/candidatos/:id/triage`). |
| **Comparador Re-Match IA** | Tras un screen failure, indica qué protocolo alternativo llamar primero (`POST /api/matching/rematch-compare`). |
| **Idioma** | App y portal en español latinoamericano. Criterios del protocolo se conservan en el idioma del sponsor; el matching unifica sinónimos ES/EN. |
| **Justificación clínica IA** | Texto en español que explica el veredicto del matching sin alterar la elegibilidad (`POST /api/matching/rationale`). |
| **Portal de candidatos** | Pre-registro público en `/candidato`, inbox en `/candidatos` y settings en `/settings/portal`. |
| **Re-Match nativo** | Propone protocolos alternativos tras un screen failure. |
| **Sub-investigator** | Rol clínico con permisos de PI excepto roles y facturación. |
| **Privacidad y regulaciones** | Páginas públicas `/privacidad` (HIPAA/GDPR/LatAm, 21 CFR Part 11) y `/integraciones` (ETL clínico PDF/CSV/portal, API). |
| **ACL por protocolo** | El PI asigna coordinadores / sub-I / CRA a cada estudio; RLS oculta el resto. |
| **Documentos cifrados** | PDF de lab y foto de receta en Storage privado + AES-256-GCM (`DOCUMENT_ENCRYPTION_KEY`). |
| **Agenda de visitas** | Calendario de pre-screening, ICF, labs, screening y randomización (`/agenda`). |
| **Pendientes** | Cola de visitas vencidas, ICF faltante y criterios 🟡 (`/pendientes`). |
| **Consentimiento informado** | Versión, fecha, responsable y PDF cifrado en el expediente. |
| **WhatsApp / SMS** | Plantillas al candidato desde `/candidatos`: te llamamos, trae receta, link del portal. |
| **Crisvia** | Rebrand del producto (antes Screenlane / Screening Intelligence). |
| **Logo** | Isotipo (pulso + dos vías) en nav, login, portal y favicon. Archivos: [`public/brand/`](public/brand/). |

---

## Qué nos diferencia

Crisvia no compite como un módulo aislado de “AI sobre historia clínica”. Es el **funnel operativo completo del clinical research site** en un solo producto SaaS accesible.

| Diferencial | Qué significa en la práctica |
|-------------|------------------------------|
| **Funnel end-to-end** | Pacientes, protocolos, matching, tracker Kanban, re-match, portal público y facturación — sin Excel ni herramientas sueltas |
| **Re-Match nativo** | Tras un screen failure, propone automáticamente otros protocolos activos donde el paciente podría encajar |
| **Dos audiencias** | Coordinadores (app clínica) y pacientes (pre-registro en `/candidato` con link del centro) |
| **Matching explicable** | Motor de reglas con semáforo 🟢🟡🔴 + detalle criterio por criterio + **justificación clínica IA** que narra el resultado sin cambiar la elegibilidad |
| **IA en el funnel** | Extrae criterios de PDF, perfil desde notas, justifica el matching y resume candidatos para la llamada — sin chat suelto |
| **RBAC + audit trail** | Roles clínicos (investigator, sub-investigator, coordinator, monitor) y bitácora orientada a 21 CFR Part 11 |
| **LATAM-first** | UI en español; el MVP funciona con registro manual, portal y **ETL de PDF de laboratorio / foto de receta** |
| **ETL clínico documentado** | Extract (CSV/portal/PDF de lab/foto de receta) → Transform (perfil + ICD-11 + reglas) → Load (screening y re-match). Sin conector a EHR hospitalario |
| **SaaS self-serve** | Trial 14 días, planes por volumen y Stripe — pensado para sitios medianos, no solo enterprise |

**En una frase:** del candidato al protocolo correcto, sin perder pacientes tras un screen failure.

**One-pager (pitch):** página imprimible en [`/one-pager`](https://screening-intel.vercel.app/one-pager) (español) y [`/one-pager?lang=en`](https://screening-intel.vercel.app/one-pager?lang=en). Texto para Notion/PDF: [`docs/ONE_PAGER.md`](docs/ONE_PAGER.md). Logo: [`public/brand/crisvia-mark.svg`](public/brand/crisvia-mark.svg) y wordmark [`public/brand/crisvia-wordmark.png`](public/brand/crisvia-wordmark.png).

---

## Características principales

| Área | Qué hace |
|------|----------|
| **Patient Registry** | Alta, búsqueda e importación CSV de pacientes |
| **Clinical Profile** | Condiciones, medicación, laboratorios + ICD-11 + notas IA + **PDF de lab / foto de receta** (extract) + **documentos cifrados** |
| **Protocol Matcher** | Criterios de inclusión/exclusión; extracción NLP desde PDF; **equipo asignado por estudio** |
| **Agenda** | Visitas de screening, ICF, labs y randomización |
| **Pendientes** | Labs faltantes, visitas vencidas y consentimiento pendiente |
| **Motor de elegibilidad** | Semáforo 🟢 Cumple / 🟡 Pendiente / 🔴 No cumple + `match_score` + justificación IA |
| **Screening Tracker** | Kanban: Pre-screening → Screening → Randomización → Screen Failure |
| **Re-Match** | Propone protocolos alternativos para pacientes con screen failure |
| **Portal candidatos** | Pre-registro público (`/candidato`) + inbox (`/candidatos`) + triage IA para la llamada + settings del portal |
| **Audit Trail** | Bitácora inmutable alineada a 21 CFR Part 11 |
| **RBAC clínico** | Investigator / Sub-investigator / Coordinator / Monitor |
| **SaaS** | Organizations, trial 14 días, Stripe Checkout + Portal |
| **ePRO** | Formularios electrónicos del paciente (Fase A) |
| **API Docs** | Swagger UI en [`/docs/api`](http://localhost:3000/docs/api) |
| **Privacidad** | Cómo se tratan los datos y marcos regulatorios: [`/privacidad`](http://localhost:3000/privacidad) |
| **ETL e integraciones** | Pipeline PDF/CSV/portal, Stripe, ICD-11: [`/integraciones`](http://localhost:3000/integraciones) |

---

## Stack tecnológico

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend / DB:** Supabase (PostgreSQL, Auth SSR, Row Level Security)
- **IA:** OpenAI GPT-4o-mini (PDF, notas, justificación de matching, triage de candidatos)
- **Pagos:** Stripe (suscripciones)
- **Validación:** Zod
- **Docs API:** OpenAPI 3.0 + Swagger UI

---

## Módulos de la aplicación

| Ruta | Descripción |
|------|-------------|
| `/dashboard` | Embudo de screening y métricas del site |
| `/patients` | Registro de pacientes |
| `/patients/[id]` | Perfil clínico + documentos cifrados + timeline de auditoría |
| `/protocols` | Gestión de protocolos (visibles según asignación) |
| `/protocols/[id]/match` | Cruce masivo + equipo del protocolo (PI) + justificación IA |
| `/agenda` | Calendario de visitas del site |
| `/pendientes` | Cola: visitas vencidas, ICF faltante, labs/criterios 🟡 |
| `/tracker` | Pipeline Kanban con drag & drop |
| `/rematch` | Re-matching automático post screen failure + comparador IA de alternativas |
| `/candidato` | Portal público de pre-registro (pacientes) |
| `/candidatos` | Inbox de leads del portal + briefing IA para la llamada + WhatsApp/SMS |
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
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # demo, portal y webhooks Stripe
NEXT_PUBLIC_APP_URL=http://localhost:3000
OPENAI_API_KEY=sk-...                     # PDF, notas, justificación matching, triage candidatos
DOCUMENT_ENCRYPTION_KEY=                  # 32 bytes hex/base64; obligatorio en production
```

Ver [`.env.example`](.env.example) para Stripe, ICD-11, MFA/sesión y login demo. Guías: [`docs/STRIPE_SETUP.md`](docs/STRIPE_SETUP.md), [`docs/BACKUP.md`](docs/BACKUP.md).

### 3. Base de datos (Supabase)

Ejecuta las migraciones **en orden** en el SQL Editor o con la CLI:

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
supabase/migrations/0015_ehr_integration.sql       # legado: tablas no usadas por la app
supabase/migrations/0016_reduce_rls_disk_io.sql
supabase/migrations/0017_secure_patient_data.sql
supabase/migrations/0018_tenant_rls_portal_sites.sql
supabase/migrations/0019_protocol_assignments_encrypted_docs.sql
supabase/migrations/0020_visits_consent.sql
supabase/migrations/0021_candidato_outreach.sql
```

Si 0016 falló porque no existía `get_user_organization_ids()`, 0018 la crea y recrea las políticas tenant. **0019** (ACL por protocolo + bucket de documentos) va después de 0018. **0020** (agenda + ICF) va después de 0019. **0021** (WhatsApp/SMS a candidatos) va después de 0020. Si el slug `demo` falló en 0009, aplica también `0011_fix_organization_slug_backfill.sql`.

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
| http://localhost:3000/privacidad | Privacidad y regulaciones |
| http://localhost:3000/integraciones | ETL e integraciones |

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

**Idioma:** la app (UI, portal, IA operativa) está en **español latinoamericano**. Título y criterios del protocolo se guardan **en el idioma del sponsor**. El motor unifica sinónimos clínicos ES/EN (`src/lib/matching/clinicalTerms.ts`). OpenAI recibe iniciales del paciente, no el nombre completo.

**Justificación clínica (IA):** en matching, `POST /api/matching/rationale` explica un cruce. En Re-Match, `POST /api/matching/rematch-compare` compara alternativas tras un screen failure. Ninguna modifica la elegibilidad ni traduce los criterios del protocolo.

---

## Inteligencia artificial

| Funcionalidad | Ruta / API | Modelo |
|---------------|------------|--------|
| Triage de candidatos | `/candidatos` · `POST /api/candidatos/:id/triage` | GPT-4o-mini |
| Extracción de protocolos PDF | `POST /api/protocols/extract` | GPT-4o-mini |
| Perfil clínico desde notas | `POST /api/patients/profile/extract` | GPT-4o-mini |
| Comparar alternativas (Re-Match) | `/rematch` · `POST /api/matching/rematch-compare` | GPT-4o-mini |
| PDF de laboratorio / foto de receta | `POST /api/patients/profile/extract-document` | GPT-4o-mini (+ visión en fotos) |
| Justificación del matching | `POST /api/matching/rationale` | GPT-4o-mini |
| Normalización ICD-11 | `GET /api/icd11/normalize` | API WHO (no LLM) |
| Matching / Re-Match | Motor de reglas | Sin LLM |

La IA **no** decide inclusión: el motor de reglas marca el semáforo y el investigador confirma.

---

## RBAC clínico

| Rol | Permisos |
|-----|----------|
| **investigator** | Protocolos, asignar equipo por estudio, aprobaciones, roles y facturación |
| **sub_investigator** | Clínica en protocolos asignados; sin roles ni billing |
| **coordinator** | Pacientes + screening de los protocolos asignados |
| **monitor** | Solo lectura de protocolos asignados (CRA) |

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

## ETL clínico (PDF y foto de receta)

Los labs y la medicación entran al expediente por **documento**, no por un conector a historia clínica hospitalaria.

| Canal | Dónde | Qué hace |
|-------|-------|----------|
| **PDF de laboratorio** | `/patients/[id]` | Lee la capa de texto y GPT-4o-mini estructura condiciones / labs. |
| **Foto de receta o lab impreso** | `/patients/[id]` | JPEG, PNG o WebP; visión de GPT-4o-mini. HEIC no está soportado. |
| **CSV / alta manual / portal** | Registro y `/candidato` | Identidad y pre-registro; el perfil clínico se completa después. |

API: `POST /api/patients/profile/extract-document` (sesión + `profiles:write`). Un humano revisa el borrador y pulsa **Guardar perfil**. El matching sigue siendo el motor de reglas.

Un PDF escaneado sin texto se fotografía con «Tomar foto». No hay OCR de páginas rasterizadas ni sync con Epic/Cerner/FHIR.

---

## SaaS y Stripe

- Trial 14 días por organization
- Planes **Free**, **Pro** y **Pro+** (`src/config.ts`)
- Webhook: `POST /api/webhooks/stripe`

Variables: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PRO`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`.

Detalle: [`docs/STRIPE_SETUP.md`](docs/STRIPE_SETUP.md).

---

## Deploy en Vercel

1. Importa el repositorio en [Vercel](https://vercel.com).
2. Configura las variables de `.env.example`.
3. Webhooks:
   - Stripe → `https://tu-dominio/api/webhooks/stripe`
4. `NEXT_PUBLIC_APP_URL` → URL de producción
5. **Authentication → MFA** → Enable TOTP (si no, investigator/sub-PI no pueden enrolar)
6. **Database → Backups** → activa PITR en Pro (ver [`docs/BACKUP.md`](docs/BACKUP.md))
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
    candidato/               # Portal público + triage IA
    profile/                 # Extract de notas, PDF de lab y foto de receta
    openapi/                 # Spec OpenAPI
  plugins/stripe/            # Checkout, portal, paywall
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

---

## Seguridad

- Autenticación Supabase SSR con middleware
- **Next.js 16.3.5** (parche de RCE de agosto 2026: Image Optimization / AVIF y Windows; cache de imágenes vacías)
- **MFA TOTP** obligatorio en producción para investigator y sub-investigator (activar TOTP en Authentication → MFA)
- Sesión: 30 min de inactividad y 8 h absolutas (`AUTH_IDLE_MINUTES`, `AUTH_SESSION_HOURS`); las cookies de `@supabase/ssr` no se usan como único límite
- Login demo (`demo@screening.local`) **deshabilitado** cuando `NODE_ENV=production`, salvo `ALLOW_DEMO_LOGIN=true`
- RLS en PostgreSQL + RBAC clínico: las políticas `using (true)` se eliminan en `0018`; el aislamiento es por `get_user_organization_ids()`
- ACL por protocolo (`0019`): sub-I / coordinador / CRA solo ven estudios asignados; PI ve todo el centro
- Documentos clínicos en Storage privado + AES-256-GCM (`DOCUMENT_ENCRYPTION_KEY`)
- Validación Zod en APIs críticas
- Portal público con rate limiting, vista `portal_sites` (sin secretos) y `anon` sin `SELECT` sobre `organizations`
- ePRO aislado por centro; bitácora sin acceso `anon`
- Herramientas de IA filtradas por organización; OpenAI recibe iniciales, no nombres

Backups y restore (PITR): [`docs/BACKUP.md`](docs/BACKUP.md).

Antes de producción con datos reales de pacientes: revisa políticas RLS, rota claves, activa MFA en el dashboard de Auth, configura PITR en Pro y completa evaluación de cumplimiento (HIPAA / GDPR según jurisdicción). Resumen para sponsors y sites: [`/privacidad`](http://localhost:3000/privacidad). Pipeline ETL (PDF/CSV/portal) y API: [`/integraciones`](http://localhost:3000/integraciones).

---

## Contribuir

1. Fork del repositorio
2. Branch: `cursor/tu-feature-4921`
3. Commit descriptivo
4. Pull Request contra `main`

---

## Autor

Desarrollado por [**julio14-byte**](https://github.com/julio14-byte) — Crisvia para clinical research sites.
