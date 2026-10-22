# Crisvia — pitch de incubadora

Hay dos formatos del mismo deck.

## Canva

Archivo: `docs/pitch/crisvia-incubadora.pptx` (16 slides, 16:9). Canva lo convierte en una presentación editable. Este entorno no tiene acceso a tu cuenta de Canva.

1. Entra a [canva.com](https://canva.com) desde el navegador de la computadora.
2. Arrastra el PPTX a la página de inicio, o usa **Subir**.
3. Abre el diseño importado. El texto queda en cajas editables.
4. Canva puede cambiar la fuente Inter por una parecida. Si quieres la misma, aplícala una vez a todo el deck.

Gráficos, SmartArt y WordArt no se importan; este archivo no los usa.

Para regenerarlo: `python3 docs/pitch/build_incubator_pptx.py`.

## Cómo publicarlo en Gamma

Este entorno no tiene `GAMMA_API_KEY`, así que el deck se publica desde tu cuenta:

1. [gamma.app](https://gamma.app) → **Create new** → **Paste in text**.
2. Pega **solo la sección “Cartas”** (desde la primera `---` inclusive).
3. Opciones: idioma **Español (Latinoamérica)**, texto **Preserve** (si eliges Generate, Gamma inventa tracción), formato **Presentation**, ratio **16:9**, un slide por `---`.
4. Tema clínico, índigo/violeta, sin fotos de “hospital con IA”.
5. En la demo en vivo, abre la app en las rutas de la sección “Recorrido”. Esas cartas son el guion de lo que se ve en pantalla.

No cites certificación HIPAA, 21 CFR Part 11 ni un número de sites clientes. Esos sellos no existen. El pedido de la última carta es el que puedes sostener hoy.

---

## Cartas (pegar desde aquí)

---

# Crisvia
## Inteligencia de screening para el clinical research site

El paciente ya llegó al centro.
Crisvia lo lleva al protocolo correcto y lo recupera si el primero no entra.

Pitch para incubadora · demo en vivo al final.

---

# El problema
## El cuello de botella está en el site, antes de randomizar

El coordinador cruza PDF, Excel y WhatsApp para decidir si alguien entra.

Un screen failure suele cerrar el caso. El mismo paciente podía caber en otro protocolo abierto del centro.

El patrocinador ya tiene su EDC y su diario. El site no tiene un lugar donde quede la decisión de screening, con fuente y con fecha.

---

# A quién le duele
## Quien opera el estudio en el centro

**Coordinador.** Arma el pre-screening a mano y persigue al candidato por teléfono.

**Investigador.** Firma la elegibilidad y necesita saber de qué documento salió cada criterio.

**Director del site.** Ve el enrolamiento tarde, cuando la ventana del protocolo ya se cerró.

El pagador es el **clinical research site** en México y LATAM. El patrocinador sigue dueño de Veeva, Clinical Ink y del IRT.

---

# La tesis
## Aprovechar a quien ya llegó

Cada paciente del centro es una oportunidad de investigación.

Crisvia es el sistema del site para ese trabajo: expediente, cruce por reglas, revisión con evidencia y recuperación tras el fallo.

Trial de 14 días. El primer cruce corre el mismo día, con los pacientes que el centro ya tiene.

---

# Qué opera Crisvia
## Del candidato a la visita, en seis pasos

1. **Llega** — portal del centro, Excel o alta manual
2. **Cruza** — motor de reglas, semáforo por criterio
3. **Revisa** — el equipo confirma cada criterio contra una fuente
4. **Sigue** — kanban hasta randomizado o screen failure
5. **Recupera** — Re-Match propone otro protocolo abierto
6. **Acompaña la visita** — calendario del site y revisión del diario del patrocinador

La elegibilidad la decide el investigador. La IA explica; no mueve el semáforo.

---

# 1. Llega
## Portal, inbox y expediente

**`/candidato`** — el paciente se pre-registra con el link del centro.

**`/candidatos`** — el coordinador convierte o archiva. Cada intento de contacto queda en bitácora: a las 48 h sin respuesta, el caso se marca.

**`/patients`** — alta manual o pegar Excel. Perfil clínico: diagnósticos, medicamentos, laboratorios.

El expediente vive en el centro. El día 1 no hace falta integrar el hospital.

---

# 2. Cruza
## Protocolo contra expediente, criterio por criterio

**`/protocols`** — inclusión y exclusión. Se pueden extraer de un PDF.

**`/protocols/[id]/match`** — motor de reglas.

- Verde: el expediente cumple
- Amarillo: falta un dato
- Rojo: no cumple

Score y detalle por criterio. Si pides justificación, la IA la escribe en español **sobre ese resultado**.

---

# 3. Revisa
## Evidencia antes de que el investigador decida

**`/protocols/[id]/revision/[paciente]`**

Por cada criterio: decisión, tipo de fuente, referencia, fecha del dato y valor leído en el documento.

Una decisión firme sin fuente no se guarda.

Al lado, la conciliación de medicamentos: vigentes, lavado del protocolo y los que hace más de 30 días que nadie verifica.

El revisor y su rol los fija la base. La bitácora es de solo agregar.

---

# 4. Sigue y recupera
## El screen failure es una fuga, no el final

**`/tracker`** — pre-screening, screening, randomizado, screen failure. Randomizado lo marca el coordinador cuando el IRT del patrocinador ya asignó.

**`/dashboard`** — embudo del site y meta de enrolamiento del protocolo: al día, en riesgo o atrasada.

**`/rematch`** — si falló un estudio, lista protocolos activos donde ese paciente no está excluido.

**`/bitacora`** — la bitácora de screening se exporta.

---

# 5. La visita
## El diario sigue en Veeva o en Clinical Ink

**`/seguimiento`** — calendario del protocolo: día objetivo, ventana, adherencia y evento adverso de la visita.

**Revisar diario**, sobre la visita ya realizada. El coordinador anota lo que vio con el paciente:

- sistema (Veeva, Clinical Ink, otro diario o papel) y la referencia
- periodo, días esperados y completados, dosis omitidas
- posible evento adverso y medicación nueva

Crisvia guarda la revisión del site. Las entradas del diario se quedan en el sistema del patrocinador.

Si el cumplimiento baja de 80 %, hay dosis omitidas, un posible evento que la visita no registró, o medicación nueva, la pantalla lo señala. Quien valora es el investigador.

---

# Confianza
## Cada centro ve solo lo suyo

- Roles: investigador, sub-investigador, coordinador, monitor (el monitor lee)
- MFA para el equipo clínico
- Bitácora de cambios
- Aislamiento por organización en Postgres
- Equipo y delegación del protocolo, con vigencia

Diseño alineado a una operación de site. La certificación regulatoria del diario y del EDC sigue en el sistema del patrocinador.

---

# Modelo
## SaaS por site, en dólares, sin implementación

| Plan | Precio | Para quién |
|---|---|---|
| Free | $0 · 14 días | Probar con hasta 50 pacientes, 3 protocolos, 1 usuario |
| Pro | $149 / mes o $1,490 / año | Un site con varios protocolos: 500 pacientes, 3 usuarios, Re-Match y portal |
| Pro+ | $329 / mes o $3,290 / año | Varios coordinadores: 2,000 pacientes, 10 usuarios, roles, MFA y bitácora |

Precio por sitio. El año cobra 10 meses. Se cancela la renovación cuando el centro quiere. Cobro con Stripe.

---

# Lo que ya está construido
## Producto operable, tracción por demostrar

Hoy se puede recorrer de punta a punta: portal, expediente, matcher, revisión con evidencia, tracker, Re-Match, visitas y revisión de diario (Veeva o Clinical Ink).

La base aísla centros y roles. Hay pruebas automáticas de ese aislamiento sobre Postgres.

Lo que esta sala debe tratar como abierto: los primeros sites de diseño, el ciclo de venta al centro y el número de pacientes cruzados en producción. Esas cifras se dicen cuando existan.

---

# El mercado
## México ya corre estudios; el software del site va atrás

México tenía del orden de **5,000 estudios clínicos** documentados en abril de 2024, y más de **5,200** registrados hacia febrero de 2025, incluidos estudios ya cerrados (UNAM / CIC, 2025; Statista, febrero 2025).

El patrocinador estandarizó EDC y diario. El coordinador del site sigue en hojas de cálculo.

Crisvia entra en ese hueco: un centro, muchos protocolos, los pacientes que ya atiende.

---

# Pedido a la incubadora
## Tres cosas, en este orden

1. **Tres sites piloto** en México para correr el trial de 14 días con un protocolo real y medir screen failures recuperados.
2. **Mentoría comercial** para venderle al director del site, no al patrocinador.
3. **Lectura regulatoria** de una persona que ya operó un centro: qué documento exige el monitor y cuál se queda en Veeva.

A cambio, el producto ya recorre el día del coordinador. La demo es esa.

---

## Recorrido en vivo (4 minutos, con la app abierta)

Hazlo después de la carta “Qué opera Crisvia”. Vuelve al deck en “Modelo”.

| Min | Pantalla | Qué dices mientras haces clic |
|---|---|---|
| 0:00 | `/dashboard` | “Esto es el site hoy: embudo y si la meta de enrolamiento va al día.” |
| 0:30 | `/candidatos` | “Este lead llegó por el link del centro. El contacto de ayer ya está anotado.” |
| 1:00 | `/protocols/…/match` | “El semáforo lo calculan las reglas del protocolo. Verde, amarillo, rojo, con el criterio.” |
| 1:40 | `/protocols/…/revision/…` | “Aquí el coordinador confirma el criterio contra el laboratorio y concilia los medicamentos.” |
| 2:20 | `/rematch` | “Este falló el estudio A. Estos otros protocolos del centro todavía lo aceptan.” |
| 3:00 | Seguimiento → Revisar diario | “El diario está en Veeva o en Clinical Ink. Aquí solo queda lo que el site revisó en la visita: días, dosis omitidas, posible evento, medicación nueva.” |

Si una migración nueva todavía no está aplicada en Supabase, sáltate esa pantalla y dilo. Las que dependen de migración reciente: metas de enrolamiento, bitácora de contacto, equipo, revisión de expediente y revisión de diario.

---

## Guion hablado (~8:00, sin contar la demo)

**0:00–0:40 — Problema.** En el site el cuello de botella es el pre-screening. El coordinador cruza a mano y, si la persona cae en screen failure, el centro casi nunca la vuelve a mirar para otro protocolo.

**0:40–1:10 — Tesis.** Crisvia trabaja con los pacientes que ya llegaron. Lleva a cada uno al protocolo correcto y lo recupera si el primero no entra. El patrocinador conserva su EDC y su diario.

**1:10–2:40 — Seis pasos.** Léelos en orden. Remarca una sola frase: la IA explica el semáforo y el investigador decide.

**2:40–6:40 — Demo.** Tabla de arriba.

**6:40–7:20 — Modelo.** Free para probar, 149 y 329 dólares por site al mes, o el anual que cobra 10 meses. Sin proyecto de implementación.

**7:20–8:00 — Pedido.** Tres sites piloto, mentoría para venderle al centro, y una lectura de alguien que ya recibió un monitor. Las cifras de tracción se presentan cuando sean reales.
