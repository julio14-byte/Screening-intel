# Stripe — checklist de configuración

## Variables en Vercel / `.env.local`

| Variable | Obligatoria | Uso |
|----------|-------------|-----|
| `STRIPE_SECRET_KEY` | Sí | Checkout, portal, webhook (`sk_test_...` o `sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Sí (prod) | Firma del webhook (`whsec_...`) |
| `STRIPE_PRICE_ID_PRO` | Sí para Pro | Price ID del plan Pro (`price_...`) |
| `STRIPE_PRICE_ID_PRO_PLUS` | Solo Pro+ | Price ID del plan Pro+ |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Webhook actualiza `organizations` |
| `NEXT_PUBLIC_APP_URL` | Sí | URLs de success/cancel en Checkout |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Opcional hoy | No usada en UI actual (Checkout hosted) |

`isStripeConfigured()` solo comprueba `STRIPE_SECRET_KEY`. Sin price ID, Checkout falla con:
*"Falta STRIPE_PRICE_ID_PRO en .env"*.

## Stripe Dashboard

1. **Productos → Precios**  
   - Crear producto "Screenlane Pro" → precio mensual recurrente  
   - Copiar **Price ID** → `STRIPE_PRICE_ID_PRO`  
   - (Opcional) Pro+ → `STRIPE_PRICE_ID_PRO_PLUS`

2. **Developers → Webhooks → Add endpoint**  
   - URL: `https://TU-DOMINIO.vercel.app/api/webhooks/stripe`  
   - Eventos:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`  
   - Copiar **Signing secret** → `STRIPE_WEBHOOK_SECRET`

3. **Local con Stripe CLI** (opcional):
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
   Usa el `whsec_` que muestra la CLI en `.env.local`.

## Probar sin Stripe (solo dev)

Ejecutar en Supabase:

```text
supabase/scripts/upgrade_org_to_pro.sql
```

Eso pone `plan_id = pro`, `subscription_status = active` y límites Pro (500 pacientes, 50 protocolos, 3 usuarios).

## Límites por plan (código)

| plan_id | Pacientes | Protocolos | Usuarios |
|---------|-----------|------------|----------|
| `starter` / `free` | 50 | 3 | 1 |
| `pro` | 500 | 50 | 3 |
| `pro_plus` | 2000 | 100 | 10 |

## Config vacía en repo

En `src/config.ts`, `stripePriceId` de Pro y Pro+ está en `""`.  
Los Price ID deben venir de **env** (`STRIPE_PRICE_ID_PRO`) o rellenar en config.
