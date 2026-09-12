# Copias de seguridad y restauración

Screenlane no guarda estado de pacientes en el servidor de la app (Vercel es
stateless). La fuente de verdad es el **proyecto de Supabase** (PostgreSQL +
Auth + Storage metadata). Recuperar un incidente de datos implica restaurar
ese proyecto, no redesplegar Next.js.

Documentación oficial: [Database Backups](https://supabase.com/docs/guides/platform/backups).

## Qué hay que tener en producción

| Recurso | Qué cubre | Qué no cubre |
|---------|-----------|--------------|
| **Backups diarios** (Pro / Team / Enterprise) | Snapshot del Postgres, incluido el esquema `auth` | Objetos de Storage (solo metadata en DB); contraseñas de roles custom |
| **PITR** (add-on Pro+) | Restaurar a un segundo concreto (RPO ~2 min) | Lo mismo: no restaura archivos de Storage borrados |
| **`supabase db dump` / `pg_dump`** | Copia lógica off-site que controlas tú | Hay que cifrarla y rotarla; no reemplaza PITR |
| **Vercel** | Código y env vars | Datos clínicos |

El plan **Free no tiene backups automáticos**. No uses Free con datos reales de
pacientes. Sube a **Pro** como mínimo y activa **Point-in-Time Recovery**.

PITR requiere compute **Small** o superior. Al activarlo, Supabase deja de
tomar backups diarios (PITR los reemplaza con granularidad mayor).

Retención PITR aproximada (add-on, precios de referencia de Supabase):

- 7 días
- 14 días
- 28 días

Elige la ventana según el RPO que el site pueda tolerar (pérdida máxima de
datos). Para un clinical research site, **14 días de PITR** es un punto de
partida razonable.

## Cómo restaurar (PITR)

1. Dashboard de Supabase → proyecto de producción.
2. **Database → Backups → Point in Time**.
3. Confirma que el instante deseado cae entre el recovery point más antiguo y
   el más reciente.
4. **Start a restore**, elige fecha/hora, revisa el resumen y confirma.
5. El proyecto queda **inaccesible** durante el restore. El tiempo depende del
   tamaño de la base. Avisa al equipo del site.
6. Espera la notificación de fin. Prueba login, un paciente y un protocolo.

Si usas replication slots o suscripciones lógicas, hay que dropearlas antes y
recrearlas después (Realtime lo maneja solo).

### Restaurar a un proyecto nuevo (recomendado para un drill)

En planes de pago: **Database → Backups → Restore to a New Project**. Así
pruebas el restore **sin tocar producción**. El clone es de base de datos;
después hay que reconfigurar Auth URLs, env vars de Vercel y webhooks
(Stripe / EHR) si vas a promover ese proyecto.

Management API (PITR):

```bash
export SUPABASE_ACCESS_TOKEN="…"
export PROJECT_REF="…"

curl -X POST \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/database/backups/restore-pitr" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recovery_time_target_unix": "1735689600"}'
```

## Dump off-site (complemento)

Aunque tengas PITR, guarda un dump cifrado fuera de Supabase (S3 con
object-lock, bucket de otro cloud, etc.):

```bash
supabase link --project-ref <ref>
supabase db dump -f backup.sql
```

Cifra el archivo antes de subirlo. No lo commitees al repo.

## Qué verificar después de un restore

- [ ] Login de un investigator (MFA TOTP sigue enrolado: vive en `auth`).
- [ ] RLS: un usuario de otro centro no ve pacientes ajenos.
- [ ] Un paciente, un protocolo y un screening recientes existen.
- [ ] Webhooks Stripe y EHR apuntan al proyecto correcto y el secreto EHR
      coincide.
- [ ] Variables `NEXT_PUBLIC_SUPABASE_URL` / keys de Vercel coinciden con el
      proyecto restaurado (si restauraste *in place* no cambian).

## Cadencia sugerida

| Actividad | Frecuencia |
|-----------|------------|
| Confirmar que PITR está **enabled** y la ventana es la esperada | Mensual |
| Restore drill a un proyecto nuevo | Al menos 2 veces al año |
| Dump off-site cifrado | Semanal (o el RPO que pida el sponsor) |
| Revisar que nadie haya borrado el proyecto (borra también los backups) | Alerta de billing + 2 owners en el org de Supabase |

Si el proyecto se **borra**, Supabase elimina backups en S3. Eso no se
recupera. Trata el project ref de producción como un activo crítico.
