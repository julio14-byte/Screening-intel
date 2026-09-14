# Crisvia — one-pager

Pitch de **una hoja** para clinical research sites e inversores.

- Página imprimible (ES): [`/one-pager`](https://screening-intel.vercel.app/one-pager)
- English: [`/one-pager?lang=en`](https://screening-intel.vercel.app/one-pager?lang=en)
- En local: `http://localhost:3000/one-pager` → **Imprimir / PDF**

Copia de trabajo (español). No incluye métricas de tracción inventadas.

---

# CRISVIA

**HealthTech SaaS · Clinical research sites**  
https://screening-intel.vercel.app

**Del candidato al protocolo correcto — y de vuelta al funnel cuando hay screen failure.**

## El problema

El enrollment es el cuello de botella del ensayo. El coordinador no tiene un sistema operativo del site: tiene Excel, WhatsApp y el CTMS del sponsor.

- Los candidatos llegan por referidos, portal o el hospital y se pierden entre el pre-registro y la visita.
- El matching es manual, lento y no explicable criterio por criterio.
- Tras un screen failure el paciente sale del radar en vez de ir a otro protocolo activo del mismo centro.

## El producto

Crisvia es el funnel operativo del clinical research site. La IA explica y acelera; el motor de reglas decide la elegibilidad.

1. **Captura** — Portal público, CSV, nota clínica, PDF de laboratorio o foto de receta.
2. **Match** — Motor de reglas con semáforo 🟢 cumple / 🟡 pendiente / 🔴 no cumple y justificación clínica.
3. **Opera** — Triage IA para la llamada, WhatsApp/SMS con plantillas, agenda de visitas y consentimiento informado.
4. **Recupera** — Screen failure → Re-Match nativo al siguiente protocolo activo del centro.

## Por qué Crisvia

| | |
|---|---|
| **Hecho para el site** | El CTMS sirve al sponsor. Crisvia cubre el día a día del coordinador y del PI. |
| **Re-Match nativo** | El screen failure no es el final: el paciente vuelve a protocolos activos del mismo centro. |
| **IA que no decide** | Extrae, resume y explica. Nunca cambia inclusión / exclusión. Semáforo auditable. |
| **LATAM-first** | Español latinoamericano. Los labs entran por PDF o foto de receta, no por un conector hospitalario. |

## Quién compra

PI o dueño de site / red de sites en México, Colombia, Argentina, Chile y Perú. Quién usa: el coordinador. Wedge: un centro, un protocolo, una métrica.

## Modelo

SaaS B2B. Trial 14 días. Stripe. Precio en USD / mes.

| Plan | Precio | Volumen |
|------|--------|---------|
| Free | $0 | 50 pacientes · 3 protocolos · 1 usuario |
| Pro | $399 | 500 pacientes · 50 protocolos · 3 usuarios |
| Pro+ | $699 | 2.000 pacientes · 100 protocolos · 10 usuarios |

## Estado

- Producto desplegado: screening-intel.vercel.app
- MVP operativo: matching, portal, rematch, agenda, ICF, WhatsApp/SMS, RBAC, bitácora
- Sin tracción comercial publicada — buscando los primeros 3 sites piloto

## El ask

**3 clinical research sites · piloto de 90 días · 1 protocolo real.**  
Métrica: tiempo a pre-screening y % de screen failures reasignados a otro estudio.

---

Controles alineados a HIPAA, GDPR, leyes de datos de LatAm y 21 CFR Part 11. Crisvia **no** emite la certificación de tu centro ni sustituye el BAA / DPA legal.
