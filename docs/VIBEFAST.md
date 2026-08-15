# Referencia VibeFast

Este proyecto adapta el patrón del boilerplate [VibeFast](https://github.com/arampersand/VibeFast) (Curso Vibecoding Remotto).

## Upstream

- **Original:** https://github.com/arampersand/VibeFast
- **Copia local:** `references/vibefast/` (submódulo git para comparar durante desarrollo)

## Fork en GitHub

Si necesitas tu propio fork en GitHub (la API del agente cloud no tiene permiso para forkear automáticamente):

1. Abre https://github.com/arampersand/VibeFast
2. Clic en **Fork** → selecciona tu cuenta (`julio14-byte`)
3. Clona tu fork:

```bash
git clone https://github.com/julio14-byte/VibeFast.git
```

## Adaptaciones en Screening-intel

| VibeFast | Screening Intelligence |
|----------|------------------------|
| `web/config.js` | `src/config.ts` (`app`, `brand`, `features`, `landing`, `pricing`) |
| `(marketing)/` landing modular | `src/app/(marketing)/` |
| `(app)/` zona privada | `src/app/(app)/` con `AppShell` |
| `PROTECTED_PREFIXES` en middleware | `src/lib/supabase/middleware.ts` |
| DaisyUI + JS | Tailwind custom + TypeScript |
| Google Auth | Email/password (demo) + Stripe SaaS |

## Rama de pruebas

Los cambios de adaptación VibeFast están en la rama `cursor/vibefast-adaptation-4921` para no tocar `main` hasta validar.
