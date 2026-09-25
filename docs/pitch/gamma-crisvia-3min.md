# Crisvia — pitch 3 minutos (para pegar en Gamma)

## Cómo usarlo en Gamma

1. Entra a [gamma.app](https://gamma.app) → **Create new** → **Paste in text**.
2. Pega **solo la sección “Cartas”** de abajo (desde la primera `---` inclusive).
3. Opciones:
   - Idioma: **Español (Latinoamérica)**
   - Modo de texto: **Preserve** (no Generate: si Gamma reescribe, inventa tracción)
   - Formato: **Presentation**
   - Ratio: **16:9**
   - Cortes: **un slide por `---`**
4. Tema: clínico, índigo/violeta, pocas fotos stock. Evita “AI hospital” genérico.

No hay API de Gamma conectada en este entorno; este archivo es el origen del deck.

Guion hablado: ~180 segundos. No cites HIPAA certificado, ICF propio ni números de sites.

---

## Cartas (pegar desde aquí)

---

# Crisvia
## Inteligencia de screening para el clinical research site

Aprovechá los pacientes que YA llegan.
Cinco módulos. EDC, ePRO e IWRS los opera un tercero.
Pitch de 3 minutos.

---

# El problema
## El pre-screening manual no escala

- El coordinador cruza PDFs, Excel y WhatsApp antes de incluir a alguien.
- Un screen failure casi siempre significa **paciente perdido**.
- El EHR del hospital no opera la cola del estudio.
- La IA suelta no puede decidir inclusión: eso es del protocolo y del site.

---

# Una frase
## Aprovechá a quien YA llegó

Cada paciente del site es una oportunidad de investigación.
Un screen failure no debería ser un paciente perdido.

No somos un CTMS.
No vendemos una base de datos.
Somos **inteligencia de screening** para el clinical research site.

---

# Cómo corre
## Cinco módulos de screening, no un chatbot

1. **Patient Registry** — quienes YA están en el site
2. **Clinical Profile** — historia, antecedentes, meds, labs
3. **Protocol Matcher** — reglas 🟢🟡🔴; la IA no cambia el veredicto
4. **Screening Tracker** — pre-screening → screening → randomizado → screen failure
5. **Re-Match & Follow-up** — el screen failure busca otro protocolo

EDC, ePRO e IWRS los opera un **tercero** (webhook).
**El coordinador confirma. Las reglas no se tocan.**

---

# Capturar
## Portal y pacientes

**Portal `/candidato`**
El paciente se pre-registra con el link del centro.

**Inbox `/candidatos`**
El coordinador convierte o archiva el lead.

**Pacientes `/patients`**
Alta manual o CSV. Perfil: diagnósticos, meds, labs, ICD-11.
El expediente es interno. No hay EHR hospitalario.

---

# Cruzar
## Protocolos y motor de elegibilidad

**Protocolos `/protocols`**
Criterios de inclusión y exclusión. Se pueden extraer de un PDF.

**Matcher `/protocols/[id]/match`**
Motor de **reglas**, no de IA. No es un sorteo de pacientes.
Semáforo 🟢 cumple · 🟡 falta dato · 🔴 no cumple.
Score + detalle criterio por criterio.

**Justificación IA**
Narra el veredicto en español.
**No cambia la elegibilidad.**

---

# Operar
## Tracker y dashboard

**Tracker `/tracker`**
Kanban: pre-screening → screening → randomizado → screen failure.
Si el protocolo tiene IWRS de un tercero, Randomizado llega por webhook. Sin IRT, el PI puede marcar Apto a mano.

**Dashboard `/dashboard`**
Los cinco módulos + embudo. El screen failure es una **fuga**, no la última etapa.

---

# Cola
## Tareas y avisos

**Cola `/cola`**
Inbox de candidatos, criterios 🟡 y re-match. Tareas guardadas del centro.

**Avisos `/avisos`**
Lead nuevo, screen failure, tarea vencida.

El coordinador confirma cada paso. La IA no cambia un semáforo.

---

# Recuperar
## Re-Match & Follow-up

**Re-Match `/rematch`**
Si falló un estudio, busca protocolos activos donde no esté excluido.
Un screen failure no es un paciente perdido.

El calendario de visitas, el ePRO y el IWRS los opera el **tercero** del estudio (`/integraciones`).
El ICF es el del site. Crisvia no inventa el consentimiento.

---

# Confianza
## Quién ve qué, y qué quedó escrito

- Roles: investigator, sub-investigador, coordinador, monitor
- MFA para el equipo clínico
- Bitácora de cambios (quién, cuándo, qué)
- Datos aislados por centro (RLS)
- Expediente alineado a FHIR Patient — diseño, no certificación

Arranca con el expediente interno. No hace falta el hospital.

---

# Cierre
## Próximo paso

Trial de 14 días en el site.
Carga pacientes, un protocolo y corre el primer cruce el mismo día.

Crisvia
Del candidato al protocolo correcto — y de vuelta si el primero no entra.

---

## Guion hablado (~3:00)

**0:00–0:20 — Problema**
En el clinical research site el cuello de botella no es “tener un EHR”. Es el pre-screening: el coordinador arma el cruce a mano y, si el paciente cae en screen failure, casi nunca vuelve a otro protocolo.

**0:20–0:35 — Frase**
Crisvia es el funnel de ese trabajo. No reemplazamos el CTMS ni el hospital. Llevamos al candidato al protocolo correcto y lo recuperamos si el primero no entra.

**0:35–0:55 — Captura**
El paciente llega por el portal del centro. El coordinador lo ve en el inbox y lo pasa a pacientes. También puede cargar CSV. El expediente se escribe en las tablas de la app.

**0:55–1:20 — Matching**
Los protocolos viven con criterios estructurados. El cruce lo hace un motor de reglas: verde, amarillo o rojo, con el porqué. Si pides una justificación, la IA solo explica ese resultado. No mueve la elegibilidad.

**1:20–1:50 — Operar**
El tracker es el Kanban del estudio. El dashboard muestra los cinco módulos. La cola guarda inbox, amarillos y re-match. Quien cambia un estado es el coordinador.

**1:50–2:15 — Recuperar**
Screen failure no es el final: Re-Match busca otro protocolo activo. EDC, ePRO e IWRS los opera un tercero. El consentimiento informado es el del site.

**2:15–2:40 — Confianza**
Roles clínicos, MFA, bitácora y datos por organización. El matching no se terceriza a un modelo. El expediente puede alinearse a FHIR; no vendemos sello HIPAA.

**2:40–3:00 — Cierre**
Se empieza sin integrar el hospital. Trial de 14 días: un protocolo, una cohorte, el primer semáforo. Esa es la demo.

---

## Mapa de módulos (por si te preguntan)

| Módulo | Ruta | Qué dices en una línea |
|---|---|---|
| 1. Registry | `/patients` | Quienes YA están en el site |
| 2. Profile | `/patients/[id]` | Historia, antecedentes, meds, labs |
| 3. Matcher | `/protocols` | Paciente ↔ protocolo, 🟢🟡🔴 |
| 4. Tracker | `/tracker` | Kanban de screening |
| 5. Re-Match | `/rematch` | Otro protocolo tras el fallo |
| Integraciones | `/integraciones` | Webhook a EDC/ePRO/IWRS de terceros |
| Dashboard | `/dashboard` | Embudo y semáforos del site |
| Candidatos | `/candidatos` | Inbox del portal |
| Portal | `/candidato` | Pre-registro público del centro |
| Cola | `/cola` | Tareas persistentes |
| Avisos | `/avisos` | Alertas operativas |
| Roles | `/settings/roles` | Investigator crea usuarios |
| Seguridad | `/settings/security` | MFA |
| Facturación | `/account/billing` | Plan y trial |

---

## Payload Gamma API (si luego pegas una `GAMMA_API_KEY`)

`textMode: preserve` · `cardSplit: inputTextBreaks` · `format: presentation` · `textOptions.language: es-mx` · `cardOptions.dimensions: 16x9` · `imageOptions.source: noImages` o `themeAccent`.
