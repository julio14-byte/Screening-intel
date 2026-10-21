# Seguridad de Crisvia

Cada control marcado con `verify:security` se comprueba de forma automática (`yarn verify:security`) y en CI.

## Controles implementados

| Capa | Control |
|------|---------|
| Identidad | Supabase Auth, MFA TOTP obligatorio a investigadores, contraseñas de 12+ caracteres sin claves comunes (NIST 800-63B), caducidad por inactividad y absoluta, cookies `Secure` y `SameSite=Lax` (el cliente de Supabase necesita leerlas, por eso no son `HttpOnly`) |
| Autorización | RBAC por rol (investigator, sub-investigator, coordinator, monitor solo lectura), `opsContext`/`requirePermission` en cada API, RLS multi-tenant por `get_user_organization_ids()` en Postgres (`verify:security`) |
| Anti-CSRF | Rechazo de mutaciones `/api` con `Sec-Fetch-Site`/`Origin` de otro sitio (`src/lib/security/csrf.ts`); server actions de Next verifican origen |
| Abuso | Rate limit compartido en Postgres (`rate_limit_hit`) en login, formularios públicos, IA y **todas las escrituras autenticadas** (240/min por usuario) |
| Entrada | Validación estricta (Zod) de cuerpos JSON, límites de tamaño, firma de archivo (PDF/TXT) antes de procesar |
| Salida | Errores genéricos al cliente; detalle solo en logs. Sin `dangerouslySetInnerHTML` |
| Navegador | CSP restrictiva (`frame-ancestors 'none'`, `object-src 'none'`), HSTS preload, COOP/CORP, `nosniff`, Permissions-Policy; `Cache-Control: private, no-store` en pantallas con datos clínicos |
| Auditoría | `audit_logs` append-only (actor tomado de la sesión), eventos de seguridad JSON (`csrf_blocked`, `login_failed`, `login_rate_limited`, `write_rate_limited`) con correos seudonimizados |
| Cadena de suministro | `resolutions`/`overrides` para dependencias transitivas vulnerables, `yarn audit` y gitleaks en CI |
| Secretos | `SUPABASE_SERVICE_ROLE_KEY` solo en servidor; nunca `NEXT_PUBLIC_`; `.env*` fuera de git |

## Riesgo residual conocido

- `sprintf-js` (vía `swagger-ui-react`, solo `/docs/api`): sin parche publicado; DoS por especificadores de formato, sin datos clínicos involucrados.
- CSP mantiene `script-src 'unsafe-inline'` porque Next inyecta scripts de hidratación sin nonce.
- Las migraciones SQL no se probaron contra un Postgres real; revísalas en un proyecto de staging.

## Checklist antes de producción

1. Supabase: activar MFA TOTP, desactivar signups públicos si no los usas, **PITR/backups**, confirmar correo, política de contraseñas ≥ 12 y protección de contraseñas filtradas (Auth → Policies).
2. Variables en el host: `REQUIRE_MFA=true`, `ALLOW_DEMO_LOGIN` vacío, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_WEBHOOK_SECRET`; rotar claves si alguna vez se compartieron.
3. Aplicar migraciones `20261007000000_enforce_plan_limits.sql` y `20261007010000_security_hardening.sql`.
4. Verificar RLS en el SQL Editor (no debe devolver filas):

```sql
select schemaname, tablename from pg_tables
where schemaname = 'public' and not rowsecurity;
```

5. Revisar usuarios con rol y MFA; eliminar cuentas demo.
6. Firmar BAA/DPA con Supabase, Vercel, OpenAI y Stripe antes de enviar datos reales de pacientes; no subir PHI a IA sin acuerdo. Preferir datos seudonimizados.
7. Configurar alertas sobre los eventos `level: "security"` del log de la plataforma.
8. Plan de respuesta a incidentes y notificación de brechas (72 h en GDPR).
