# Screening Intelligence para Research Sites

MVP de una plataforma que ayuda a clínicas de investigación a optimizar el **pre-screening** y **re-matching** de pacientes para sus protocolos clínicos.

## Stack

- **Next.js** (App Router, TypeScript, Tailwind CSS) — listo para desplegar en Vercel.
- **Supabase** (PostgreSQL con Row Level Security) — persistencia y API.
- **Lucide** — íconos; componentes UI propios, accesibles y densos en datos.

## Módulos

| Ruta | Módulo | Descripción |
| --- | --- | --- |
| `/` | Panel general | Métricas del sitio y accesos a los módulos. |
| `/login` | Login | Ingreso y registro con Supabase Auth (email + contraseña). |
| `/patients` | Patient Registry | Listado de pacientes con buscador y alta de nuevos pacientes. |
| `/patients/[id]` | Clinical Profile | Edición de condiciones, medicación concomitante y laboratorios. |
| `/protocols` | Protocol Matcher | Alta de protocolos con criterios estructurados de inclusión/exclusión. |
| `/protocols/[id]/match` | Motor de cruce | Ranking de toda la base de pacientes con semáforo 🟢 Cumple / 🟡 Pendiente / 🔴 No cumple y detalle criterio por criterio. |
| `/tracker` | Screening Tracker | Kanban con drag & drop: Pre-screening → Screening → Randomización → Screen Failure. |
| `/rematch` | Re-Match & Follow-up | Para cada paciente con screen failure, propone automáticamente otros protocolos activos donde podría encajar. |

## Motor de matching

La lógica vive en `src/lib/matching.ts` y evalúa cada criterio del protocolo contra el perfil del paciente:

- **🟢 Cumple (eligible):** todos los criterios de inclusión superados y ninguna exclusión activada.
- **🟡 Pendiente (pending):** falta información (sin perfil clínico o sin un laboratorio requerido).
- **🔴 No cumple (excluded):** falla un criterio de inclusión o se activa una exclusión.

El `match_score` es el porcentaje de criterios superados sobre el total evaluado, y `match_details` guarda la trazabilidad criterio por criterio en la tabla `screenings`.

## Puesta en marcha

### 1. Base de datos (Supabase)

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. En el **SQL Editor**, ejecutá `supabase/migrations/0001_initial_schema.sql` (tablas, enums, triggers y políticas RLS).
3. Ejecutá `supabase/migrations/0002_require_authentication.sql` para que los datos exijan sesión iniciada (recomendado si la app es pública).
4. (Opcional) Ejecutá `supabase/seed.sql` para cargar datos de demo (8 pacientes, 3 protocolos y screenings iniciales).

Alternativa con CLI: `supabase link` + `supabase db push`.

### Login de prueba

La app usa **Supabase Auth** con email y contraseña. Para crear un usuario de prueba tenés dos caminos:

- **Desde el dashboard:** Authentication → Users → **Add user** (marcá "Auto Confirm User").
- **Desde la app:** en `/login`, usá "Registrate para probar". Si el proyecto tiene activada la confirmación por email (opción por defecto), vas a tener que confirmar desde el correo; para pruebas podés desactivar **Confirm email** en Authentication → Sign In / Providers → Email.

### 2. Aplicación

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

RLS está habilitado en todas las tablas. La migración `0001` crea políticas permisivas (rol `anon`) para poder probar sin login; la migración `0002` las reemplaza por políticas que exigen usuario autenticado, acompañando el login de la app. Para producción multi-clínica, el siguiente paso es filtrar por `clinic_id` contra `app_metadata` del JWT (ver comentarios en las migraciones).
