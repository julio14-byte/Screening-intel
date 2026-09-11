# Guía de seguridad — Screening Intelligence

Endurecimiento (hardening) para HealthTech: datos clínicos multi-tenant, cabeceras HTTP, validación de entrada y rate limiting.

## 1. Cabeceras HTTP y CSP

**Archivo:** `src/lib/security/headers.ts`  
**Integración:** `next.config.ts` aplica cabeceras a todas las rutas.

| Cabecera | Valor | Propósito |
|----------|-------|-----------|
| `Content-Security-Policy` | Política estricta | Mitiga XSS, inyección de scripts |
| `X-Frame-Options` | `DENY` | Anti clickjacking |
| `X-Content-Type-Options` | `nosniff` | Evita MIME sniffing |
| `Strict-Transport-Security` | 2 años + preload (prod) | Fuerza HTTPS |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limita filtración de URLs |
| `Permissions-Policy` | Cámara/mic/geo deshabilitados | Superficie de ataque reducida |

**Producción:** verificá CSP en el navegador (DevTools → Network). Si agregás analytics o CDN, extendé `connect-src` / `script-src` en `headers.ts`.

## 2. Row Level Security (RLS) multi-tenant

**Migraciones:** `0007_rbac.sql` (roles clínicos) + `0008_security_tenant_rls.sql` (aislamiento por organización).

### Modelo de tenant

- `clinic_id` en `patients` y `protocols` **debe coincidir** con `organizations.id`.
- Membresía vía `organization_members`.
- Funciones clave:
  - `user_belongs_to_clinic(clinic_id)` — boundary de tenant
  - `get_user_primary_organization_id()` — org por defecto al insertar
  - `can_write_clinical_data()` / `get_user_app_role()` — RBAC clínico

### Aplicar en Supabase

```bash
# SQL Editor o CLI
supabase db push
# O ejecutar manualmente:
# 0006_audit_trail.sql → 0007_rbac.sql → 0008_security_tenant_rls.sql
```

### Buenas prácticas

- **Nunca** uses `user_metadata` del JWT para autorización; solo `auth.uid()` + tablas RLS.
- El rol `anon` no tiene acceso a tablas clínicas (revocado en `0008`).
- Escritura en `audit_logs` solo vía funciones `SECURITY DEFINER` en schema `audit`.

## 3. Validación con Zod

**Archivo:** `src/lib/security/schemas.ts`

Esquemas para login, importación de pacientes, RBAC, auditoría y waitlist. Uso recomendado:

```typescript
import { safeParseBody, loginBodySchema } from "@/lib/security/schemas";

const parsed = safeParseBody(loginBodySchema, body);
if (!parsed.success) {
  return NextResponse.json({ error: parsed.error }, { status: 400 });
}
```

**Rutas/actions ya protegidas:**

- `POST /api/auth/login`
- `POST /api/patients/import`
- `POST /api/waitlist`
- `GET/POST /api/audit`
- `PUT /api/rbac/roles`
- Server Actions en `src/actions/rbac.ts` y `src/actions/audit.ts`

Los textos clínicos rechazan caracteres de control y tags `<>` para reducir XSS almacenado.

## 4. Rate limiting

**Archivos:** `src/lib/security/rate-limit.ts`, `enforce-rate-limit.ts`, `middleware.ts`

| Ruta | Límite | Ventana |
|------|--------|---------|
| `POST /api/auth/login` | 10 | 15 min |
| `POST /api/patients/import` | 20 | 1 h |
| `POST /api/waitlist` | 5 | 1 h |
| Escritura `/api/rbac/*` | 30 | 1 h |
| `POST /api/audit` | 60 | 1 h |

El middleware aplica límites con un store **en memoria** por instancia. En Vercel con varias réplicas, cada una cuenta por separado; para rate limiting global en prod considerá Redis u otro store compartido más adelante.

Respuesta `429` incluye `Retry-After` y cabeceras `X-RateLimit-*`.

## 5. Checklist de despliegue

- [ ] Migraciones `0006`–`0008` aplicadas en Supabase
- [ ] `SUPABASE_SERVICE_ROLE_KEY` solo en servidor (nunca `NEXT_PUBLIC_*`)
- [ ] HTTPS forzado (Vercel lo hace por defecto; HSTS activo en prod)
- [ ] Revisar políticas RLS en Dashboard → Authentication → Policies
- [ ] Rotar claves si alguna se expuso en logs o commits
- [ ] Habilitar **Leaked Password Protection** en Supabase Auth (si disponible en tu plan)

## 6. Próximos pasos recomendados

- MFA para investigadores (Supabase Auth TOTP)
- Cifrado a nivel de columna para PHI sensible (pgcrypto / vault externo)
- WAF (Cloudflare / Vercel Firewall) delante de endpoints públicos
- Pentest anual y revisión de cumplimiento HIPAA / GDPR según jurisdicción
