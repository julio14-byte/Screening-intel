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
| `web/config.js` | `src/config.ts` (`app`, `brand`, `features`, `landing`, `pricing`, `routes`) |
| `config.routes` + `app.nav` | URLs canónicas y sidebar desde un solo config |
| `(marketing)/` landing modular | `src/app/(marketing)/` |
| `(app)/` zona privada | `src/app/(app)/` con `AppShell` |
| `PROTECTED_PREFIXES` en middleware | `config.routes.protected` vía `src/lib/app/routes.ts` |
| DaisyUI + JS | Tailwind custom + TypeScript |
| Google Auth | Email/password (demo) + Stripe SaaS |

## URLs de la app (desde `config.routes`)

| Módulo | URL |
|--------|-----|
| Landing | `/` |
| Login | `/login` |
| Tablero + métricas | `/dashboard` |
| Pacientes | `/patients`, `/patients/[id]` |
| Protocolos | `/protocols`, `/protocols/[id]/match` |
| Tracker | `/tracker` |
| Re-Match | `/rematch` |
| Asistente IA | `/chat` |
| Facturación | `/account/billing` |

## Rama de pruebas

Los cambios de adaptación VibeFast están en la rama `cursor/vibefast-adaptation-4921` para no tocar `main` hasta validar.
