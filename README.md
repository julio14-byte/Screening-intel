# Screening Intelligence para Research Sites

MVP de una plataforma que ayuda a clínicas de investigación a optimizar el **pre-screening** y **re-matching** de pacientes para sus protocolos clínicos.

## Stack

- **Next.js** (App Router, TypeScript, Tailwind CSS) — listo para desplegar en Vercel.
- **Supabase** (PostgreSQL con Row Level Security) — persistencia y API.
- **Lucide** — íconos; componentes UI propios, accesibles y densos en datos.

## Módulos

| Ruta | Módulo | Descripción |
| --- | --- | --- |
| `/patients` | Patient Registry | Listado de pacientes con buscador y alta de nuevos pacientes. |
| `/patients/[id]` | Clinical Profile | Edición de condiciones, medicación concomitante y laboratorios. |
| `/protocols` | Protocol Matcher | Alta de protocolos con criterios estructurados de inclusión/exclusión. |
| `/protocols/[id]/match` | Motor de cruce | Ranking de toda la base de pacientes con semáforo 🟢 Cumple / 🟡 Pendiente / 🔴 No cumple y detalle criterio por criterio. |
| `/tracker` | Screening Tracker | Kanban con drag & drop: Pre-screening → Screening → Randomización → Screen Failure. |
| `/rematch` | Re-Match & Follow-up | Para cada paciente con screen failure, propone automáticamente otros protocolos activos donde podría encajar. |
| `/account/billing` | Facturación | Plan, trial, checkout Stripe y portal de cliente (Fase 1 SaaS). |

## SaaS Fase 1 (Stripe)

- `src/config.ts`: `features.pricing` y `features.payments` activados.
- Plugin en `src/plugins/stripe/` (checkout, portal, webhook, paywall).
- Migración `supabase/migrations/0002_profiles_saas_fase1.sql` (organizations + trial 14 días).
- Planes: **Starter** (50 pacientes, 3 protocolos) y **Site Pro** (500 pacientes, 50 protocolos).

Variables: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PRO`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`.

Webhook Stripe → `https://tu-dominio/api/webhooks/stripe`

## Motor de matching

La lógica vive en `src/lib/matching.ts` y evalúa cada criterio del protocolo contra el perfil del paciente:

- **🟢 Cumple (eligible):** todos los criterios de inclusión superados y ninguna exclusión activada.
- **🟡 Pendiente (pending):** falta información (sin perfil clínico o sin un laboratorio requerido).
- **🔴 No cumple (excluded):** falla un criterio de inclusión o se activa una exclusión.

El `match_score` es el porcentaje de criterios superados sobre el total evaluado, y `match_details` guarda la trazabilidad criterio por criterio en la tabla `screenings`.

## RBAC clínico (investigator / coordinator / monitor)

Control de acceso basado en roles para personal del research site.

### Migración

Ejecutá `supabase/migrations/0007_rbac.sql` después de `0006_audit_trail.sql`.

Incluye:
- Enum `app_role` y tabla `user_roles`
- Funciones `get_user_app_role()`, `can_write_clinical_data()`, etc.
- RLS por rol en `patients`, `clinical_profiles`, `protocols`, `screenings`
- Trigger: solo `investigator` puede pasar a estatus `randomized` (Apto)
- RPC `assign_user_clinical_role` para administración de roles

### Roles

| Rol | Permisos |
|-----|----------|
| **investigator** | Control total, protocolos, aprobaciones médicas, gestión de roles |
| **coordinator** | Alta/edición de pacientes, perfil clínico, screening (sin randomización) |
| **monitor** | Solo lectura: expedientes + audit trail (CRA) |

### Server Actions / permisos

```typescript
import { requirePermission } from "@/lib/rbac/require-permission";

const { user, role } = await requirePermission("screenings:approve");
```

### UI

```tsx
import { RoleGuard } from "@/components/rbac/RoleGuard";

<RoleGuard allowedRoles={["investigator"]}>
  <Button>Aprobar criterio</Button>
</RoleGuard>
```

### Administración de usuarios

En `/settings/roles` (solo **investigator**):
- **Crear usuario** con email, contraseña temporal, nombre y rol clínico
- **Cambiar rol** de miembros existentes

Requiere `SUPABASE_SERVICE_ROLE_KEY` en el servidor para crear usuarios en Auth.

## Audit Trail (21 CFR Part 11)

Bitácora de auditoría inmutable para expedientes de pacientes.

### 1. Migración

En el SQL Editor de Supabase, ejecutá `supabase/migrations/0006_audit_trail.sql` después de las migraciones anteriores.

Incluye:

- Tabla `audit_logs` (append-only).
- Triggers en `patients` para `UPDATE` y `DELETE`.
- RPC `record_custom_audit_event` para eventos manuales (aprobaciones, notas).
- Protección contra `UPDATE`/`DELETE` directos en `audit_logs`.

### 2. Server Actions / API

```typescript
import { logCustomAuditEventAction } from "@/actions/audit";

await logCustomAuditEventAction({
  tableName: "patients",
  recordId: patientId,
  description: "El investigador principal aprobó el criterio de inclusión.",
  metadata: { protocol_id: "...", criterion: "Edad 18-75" },
});
```

- `POST /api/audit` — registrar evento manual (JSON).
- `GET /api/audit?table_name=patients&record_id=<uuid>` — consultar bitácora.

### 3. UI

En `/patients/[id]` se muestra `<AuditTimeline />`. También podés usarlo en cualquier expediente:

```tsx
import { AuditTimeline } from "@/components/audit/audit-timeline";

<AuditTimeline tableName="patients" recordId={patient.id} />
```

### Extender a otras tablas

Para auditar `clinical_profiles` o `screenings`, agregá triggers similares:

```sql
create trigger clinical_profiles_audit_trail
  after update or delete on public.clinical_profiles
  for each row execute function audit.capture_row_change();
```

## Puesta en marcha

### 1. Base de datos (Supabase)

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. En el **SQL Editor**, ejecutá `supabase/migrations/0001_initial_schema.sql` (tablas, enums, triggers y políticas RLS).
3. Ejecutá `supabase/migrations/0002_profiles_saas_fase1.sql` (profiles + organizations SaaS).
4. (Opcional) Ejecutá `supabase/seed.sql` para cargar datos de demo.

Alternativa con CLI: `supabase link` + `supabase db push`.

### Métricas de producto (waitlist, signups, chat IA)

1. Ejecutá `supabase/migrations/0003_waitlist_ai_metrics.sql`.
2. Configurá `SUPABASE_SERVICE_ROLE_KEY` en el servidor para leer métricas globales en el tablero.
3. Las sesiones del asistente en `/chat` se guardan automáticamente en `ai_conversations`.
4. Waitlist: `POST /api/waitlist` con `{ "email": "..." }` (público).


```bash
cp .env.example .env.local   # completar con la URL y anon key del proyecto
npm install
npm run dev                  # http://localhost:3000
```

### 3. Deploy en Vercel

Importá el repo en Vercel y definí las variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`. No se requiere configuración adicional.

## Estructura del proyecto

```
supabase/
  migrations/          # Esquema SQL (tablas, RLS, triggers)
  seed.sql             # Datos de demo
src/
  lib/
    types.ts           # Tipos de dominio (tablas + motor de matching)
    matching.ts        # Motor de reglas de elegibilidad (core)
    supabase/client.ts # Cliente supabase-js (singleton, env vars)
    utils.ts           # Helpers (edad, normalización, labels)
  hooks/               # Hooks de datos (usePatients, useProtocolMatch, useRematch…)
  components/
    ui/                # Primitivas (Button, Card, Modal, VerdictBadge…)
    layout/            # AppShell con navegación lateral
    patients/ profile/ protocols/ tracker/  # Componentes por módulo
  app/                 # Rutas del App Router
```

## Nota sobre seguridad (MVP)

RLS está habilitado en todas las tablas con políticas permisivas para el rol `anon`, pensadas para un MVP de una sola clínica sin autenticación. Antes de producción, incorporá Supabase Auth y reemplazá las políticas por filtros de `clinic_id` contra `app_metadata` del JWT (ver comentarios en la migración).
