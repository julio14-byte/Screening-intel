# Seguridad de Crisvia

Cada control marcado con `verify:security` se comprueba de forma automática (`yarn verify:security`) y en CI.

## Controles implementados

| Capa | Control |
|------|---------|
| Identidad | Supabase Auth, MFA TOTP obligatorio a investigadores, contraseñas de 12+ caracteres sin claves comunes (NIST 800-63B), caducidad por inactividad y absoluta, cookies `Secure` y `SameSite=Lax` (el cliente de Supabase necesita leerlas, por eso no son `HttpOnly`) |
| Autorización | RBAC por rol (investigator, sub-investigator, coordinator, monitor solo lectura), `opsContext`/`requirePermission` en cada API, RLS multi-tenant por `get_user_organization_ids()` en Postgres (`verify:security`). Las tablas de `public` no se exponen solas: cada una tiene `GRANT` explícito |
| Anti-CSRF | Rechazo de mutaciones `/api` con `Sec-Fetch-Site`/`Origin` de otro sitio (`src/lib/security/csrf.ts`); server actions de Next verifican origen |
| Abuso | Rate limit compartido en Postgres (`rate_limit_hit`) en login, formularios públicos, IA y **todas las escrituras autenticadas** (240/min por usuario). El cupo por IP usa solo `x-vercel-forwarded-for` |
| Entrada | Validación estricta (Zod) de cuerpos JSON, límites de tamaño, firma de archivo (PDF/TXT) antes de procesar |
| Salida | Errores genéricos al cliente; detalle solo en logs. Sin `dangerouslySetInnerHTML` |
| Navegador | CSP con nonce por petición y `strict-dynamic` en `script-src` (sin `unsafe-inline`), `frame-ancestors 'none'`, `object-src 'none'`, HSTS preload, COOP/CORP, `nosniff`, Permissions-Policy; `Cache-Control: private, no-store` en pantallas con datos clínicos |
| Auditoría | `audit_logs` append-only (actor tomado de la sesión), eventos de seguridad JSON (`csrf_blocked`, `login_failed`, `login_rate_limited`, `write_rate_limited`) con correos seudonimizados |
| Cadena de suministro | `resolutions`/`overrides` para dependencias transitivas vulnerables, `yarn audit` y gitleaks en CI |
| Secretos | `SUPABASE_SERVICE_ROLE_KEY` solo en servidor; nunca `NEXT_PUBLIC_`; `.env*` fuera de git |

## Riesgo residual conocido

- El pre-registro público está apagado hasta `CANDIDATE_PORTAL_ENABLED=true`. Encendido, guarda el envío para el coordinador y no le dice al visitante si califica.
- `sprintf-js` (vía `swagger-ui-react`, solo `/docs/api`): sin parche publicado; DoS por especificadores de formato, sin datos clínicos involucrados.
- `style-src` conserva `'unsafe-inline'` (atributos `style` de React y Swagger UI); no permite ejecutar scripts.
- Las migraciones se aplican en CI sobre un Postgres 17 vacío. Conviene repetirlas en un proyecto de staging de Supabase antes de producción.
- Una tabla nueva en `public` no recibe privilegios de la Data API. La migración que la crea tiene que conceder solo lo que van a usar `anon`, `authenticated` o `service_role`, y dejar RLS activo.

## Checklist antes de producción

1. Supabase: activar MFA TOTP, desactivar signups públicos si no los usas, **PITR/backups**, confirmar correo, política de contraseñas ≥ 12 y protección de contraseñas filtradas (Auth → Policies).
2. Variables en el host: `REQUIRE_MFA=true`, `ALLOW_DEMO_LOGIN` vacío, `CANDIDATE_PORTAL_ENABLED` vacío hasta usar el pre-registro, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_WEBHOOK_SECRET`; rotar claves si alguna vez se compartieron.
3. Aplicar migraciones `20261007000000_enforce_plan_limits.sql` y `20261007010000_security_hardening.sql`.
4. Verificar RLS en el SQL Editor (no debe devolver filas):

```sql
select schemaname, tablename from pg_tables
where schemaname = 'public' and not rowsecurity;
```

5. Revisar usuarios con rol y MFA; eliminar cuentas demo.
6. Firmar BAA/DPA con Supabase, Vercel, OpenAI y Stripe antes de enviar datos reales de pacientes; no subir PHI a IA sin acuerdo. Preferir datos seudonimizados.
7. Configurar alertas sobre los eventos `level: "security"` del log de la plataforma.
8. Plan de respuesta a incidentes: la LFPDPPP (art. 19) exige informar de inmediato a los titulares cuando una vulneración afecte de forma significativa sus derechos patrimoniales o morales. Define quién decide, quién notifica al centro (Responsable) y en qué plazo contractual.
9. Completar `NEXT_PUBLIC_LEGAL_ENTITY_NAME`, `NEXT_PUBLIC_LEGAL_ADDRESS` y `NEXT_PUBLIC_PRIVACY_EMAIL` para que `/privacidad` muestre la identidad y el contacto ARCO.

## Pruebas en CI sobre Postgres real

El workflow `Security` ejecuta, además de `verify:all`, un job `database`:

- `scripts/db/apply-migrations.sh` aplica `supabase/ci/00_supabase_shim.sql` (roles `anon`/`authenticated`/`service_role`, esquema `auth`) y todas las migraciones, en orden, sobre un Postgres 17 vacío.
- `scripts/db/run-rls-tests.sh` ejecuta `supabase/ci/*_tests.sql`: aislamiento entre organizaciones, acceso nulo de `anon`, solo lectura del monitor y escritura de `site_profiles` limitada al investigador.

En local: `createdb crisvia_ci && DATABASE_URL=postgres:///crisvia_ci yarn db:migrate:ci && DATABASE_URL=postgres:///crisvia_ci yarn db:test`.
Cada migración nueva con tablas de datos de paciente debe conceder los privilegios de la Data API y añadir aserciones de aislamiento en `supabase/ci/`.
