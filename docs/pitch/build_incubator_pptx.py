#!/usr/bin/env python3
"""Deck de incubadora en PPTX. Canva lo importa como presentación editable."""

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Inches, Pt

OUT = "docs/pitch/crisvia-incubadora.pptx"
FONT = "Inter"

INK = "1E1B4B"
VIOLET = "6D28D9"
VIOLET_DEEP = "4C1D95"
SOFT = "F5F3FF"
CARD = "FFFFFF"
LINE = "E9E5F5"
SLATE = "334155"
MUTED = "64748B"
WHITE = "FFFFFF"
LILAC = "DDD6FE"


def rgb(value: str) -> RGBColor:
    value = value.lstrip("#")
    return RGBColor(int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16))


def kill_style(shape) -> None:
    style = shape._element.find(qn("p:style"))
    if style is not None:
        shape._element.remove(style)
    shape.shadow.inherit = False


def rect(slide, x, y, w, h, fill, line=None, radius=False):
    kind = MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE
    shape = slide.shapes.add_shape(kind, Inches(x), Inches(y), Inches(w), Inches(h))
    shape.fill.solid()
    shape.fill.fore_color.rgb = rgb(fill)
    if line is None:
        shape.line.fill.background()
    else:
        shape.line.color.rgb = rgb(line)
        shape.line.width = Pt(1)
    kill_style(shape)
    if radius:
        from lxml import etree

        av = shape._element.spPr.prstGeom.avLst
        gd = etree.SubElement(av, qn("a:gd"))
        gd.set("name", "adj")
        gd.set("fmla", "val 8000")
    return shape


def write(slide, x, y, w, h, text, size, color, bold=False, align="left", anchor="top"):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    frame = box.text_frame
    frame.word_wrap = True
    frame.auto_size = None
    frame.margin_left = Emu(0)
    frame.margin_right = Emu(0)
    frame.margin_top = Emu(0)
    frame.margin_bottom = Emu(0)
    frame.paragraphs[0].alignment = {"left": PP_ALIGN.LEFT, "center": PP_ALIGN.CENTER}[align]
    anchors = {"top": MSO_ANCHOR.TOP, "middle": MSO_ANCHOR.MIDDLE}
    frame.paragraphs[0].space_before = Pt(0)
    frame.paragraphs[0].space_after = Pt(0)
    # vertical anchor lives on the body
    body = frame._txBody.bodyPr
    body.set("anchor", {"top": "t", "middle": "ctr"}[anchor])
    run = frame.paragraphs[0].add_run()
    run.text = text
    run.font.name = FONT
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = rgb(color)
    return box


def chrome(slide, eyebrow, title):
    rect(slide, 0, 0, 13.333, 7.5, WHITE)
    rect(slide, 0, 0, 0.12, 7.5, VIOLET)
    write(slide, 0.55, 0.28, 10, 0.28, eyebrow, 12, VIOLET, bold=True)
    write(slide, 0.55, 0.54, 12.2, 0.7, title, 28, INK, bold=True)
    write(slide, 0.55, 7.12, 8, 0.24, "Crisvia  ·  inteligencia de screening", 11, MUTED)
    write(slide, 9.4, 7.12, 3.4, 0.24, "Incubadora", 11, MUTED, align="left")


def card(slide, x, y, w, h, kicker, body):
    rect(slide, x, y, w, h, SOFT, radius=True)
    write(slide, x + 0.28, y + 0.28, w - 0.5, 0.4, kicker, 14, VIOLET, bold=True)
    write(slide, x + 0.28, y + 0.78, w - 0.5, h - 1.05, body, 16, SLATE)


def build() -> Presentation:
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    prs.core_properties.title = "Crisvia — pitch de incubadora"
    prs.core_properties.author = "Crisvia"
    blank = prs.slide_layouts[6]

    # 1. Portada
    s = prs.slides.add_slide(blank)
    rect(s, 0, 0, 13.333, 7.5, INK)
    rect(s, 0, 0, 0.18, 7.5, VIOLET)
    write(s, 0.7, 1.55, 8, 0.3, "INCUBADORA", 13, LILAC, bold=True)
    write(s, 0.7, 1.95, 11, 1.1, "Crisvia", 60, WHITE, bold=True)
    write(s, 0.7, 3.15, 10, 0.9, "Inteligencia de screening\npara el clinical research site", 26, LILAC)
    rect(s, 0.7, 4.35, 2.2, 0.06, VIOLET)
    write(s, 0.7, 4.6, 10, 1.1, "El paciente ya llegó al centro.\nCrisvia lo lleva al protocolo correcto y lo recupera si el primero no entra.", 18, "E2E8F0")
    write(s, 0.7, 6.55, 8, 0.3, "Demo en vivo al cierre", 14, LILAC)

    # 2. Problema
    s = prs.slides.add_slide(blank)
    chrome(s, "EL PROBLEMA", "El cuello de botella está en el site, antes de randomizar")
    card(s, 0.55, 1.85, 3.9, 4.4, "01  ·  A mano", "El coordinador cruza PDF, Excel y WhatsApp para decidir si alguien entra a un protocolo.")
    card(s, 4.7, 1.85, 3.9, 4.4, "02  ·  Se pierde", "Un screen failure suele cerrar el caso. El mismo paciente podía caber en otro protocolo abierto del centro.")
    card(s, 8.85, 1.85, 3.9, 4.4, "03  ·  Sin rastro", "El patrocinador ya tiene su EDC y su diario. El site no tiene un lugar donde quede la decisión, con fuente y con fecha.")

    # 3. Quién
    s = prs.slides.add_slide(blank)
    chrome(s, "A QUIÉN LE DUELE", "Quien opera el estudio en el centro")
    card(s, 0.55, 1.7, 3.9, 3.7, "Coordinador", "Arma el pre-screening a mano y persigue al candidato por teléfono.")
    card(s, 4.7, 1.7, 3.9, 3.7, "Investigador", "Firma la elegibilidad y necesita saber de qué documento salió cada criterio.")
    card(s, 8.85, 1.7, 3.9, 3.7, "Director del site", "Ve el enrolamiento tarde, cuando la ventana del protocolo ya se cerró.")
    write(s, 0.55, 5.7, 12.2, 1.0, "El pagador es el clinical research site en México y LATAM. El patrocinador sigue dueño de Veeva, Clinical Ink y del IRT.", 18, SLATE)

    # 4. Tesis
    s = prs.slides.add_slide(blank)
    rect(s, 0, 0, 13.333, 7.5, INK)
    rect(s, 0, 0, 0.18, 7.5, VIOLET)
    write(s, 0.7, 1.7, 11, 0.3, "LA TESIS", 13, LILAC, bold=True)
    write(s, 0.7, 2.15, 11.5, 1.6, "Aprovechar a quien\nya llegó.", 44, WHITE, bold=True)
    write(s, 0.7, 4.3, 11, 1.4, "Cada paciente del centro es una oportunidad de investigación.\nExpediente, cruce por reglas, revisión con evidencia y recuperación tras el fallo.", 18, "E2E8F0")
    write(s, 0.7, 6.2, 11, 0.5, "Trial de 14 días. El primer cruce corre el mismo día, con los pacientes que el centro ya tiene.", 16, LILAC)

    # 5. Seis pasos
    s = prs.slides.add_slide(blank)
    chrome(s, "QUÉ OPERA CRISVIA", "Del candidato a la visita, en seis pasos")
    steps = [
        ("1", "Llega", "Portal del centro, Excel o alta manual."),
        ("2", "Cruza", "Motor de reglas. Semáforo por criterio."),
        ("3", "Revisa", "El equipo confirma cada criterio contra una fuente."),
        ("4", "Sigue", "Kanban hasta randomizado o screen failure."),
        ("5", "Recupera", "Re-Match propone otro protocolo abierto."),
        ("6", "Visita", "Calendario del site y revisión del diario del patrocinador."),
    ]
    for i, (n, title, body) in enumerate(steps):
        col = i % 3
        row = i // 3
        x = 0.55 + col * 4.2
        y = 1.7 + row * 2.45
        rect(s, x, y, 3.95, 2.2, SOFT, radius=True)
        write(s, x + 0.25, y + 0.22, 0.6, 0.45, n, 22, VIOLET, bold=True)
        write(s, x + 0.85, y + 0.28, 2.8, 0.4, title, 18, INK, bold=True)
        write(s, x + 0.25, y + 0.9, 3.45, 1.0, body, 15, SLATE)
    write(s, 0.55, 6.7, 12, 0.3, "La elegibilidad la decide el investigador. La IA explica; no mueve el semáforo.", 14, MUTED)

    # 6. Llega
    s = prs.slides.add_slide(blank)
    chrome(s, "1  ·  LLEGA", "Portal, inbox y expediente")
    card(s, 0.55, 1.7, 3.9, 4.6, "/candidato", "El paciente se pre-registra con el link del centro.")
    card(s, 4.7, 1.7, 3.9, 4.6, "/candidatos", "El coordinador convierte o archiva. Cada intento de contacto queda en bitácora. A las 48 h sin respuesta, el caso se marca.")
    card(s, 8.85, 1.7, 3.9, 4.6, "/patients", "Alta manual o pegar Excel. Perfil clínico: diagnósticos, medicamentos, laboratorios. El día 1 no hace falta integrar el hospital.")

    # 7. Cruza
    s = prs.slides.add_slide(blank)
    chrome(s, "2  ·  CRUZA", "Protocolo contra expediente, criterio por criterio")
    card(s, 0.55, 1.7, 5.9, 4.7, "/protocols", "Inclusión y exclusión. Los criterios se pueden extraer de un PDF del protocolo.")
    rect(s, 6.7, 1.7, 6.05, 4.7, SOFT, radius=True)
    write(s, 6.98, 1.98, 5.5, 0.4, "/protocols/…/match", 14, VIOLET, bold=True)
    lights = [("Verde", "El expediente cumple."), ("Amarillo", "Falta un dato."), ("Rojo", "No cumple.")]
    for i, (name, body) in enumerate(lights):
        y = 2.6 + i * 1.1
        rect(s, 6.98, y, 0.16, 0.7, VIOLET)
        write(s, 7.35, y, 4.9, 0.32, name, 16, INK, bold=True)
        write(s, 7.35, y + 0.34, 4.9, 0.4, body, 14, SLATE)
    write(s, 0.55, 6.6, 12.2, 0.4, "Score y detalle por criterio. La justificación en español describe ese resultado.", 14, MUTED)

    # 8. Revisa
    s = prs.slides.add_slide(blank)
    chrome(s, "3  ·  REVISA", "Evidencia antes de que el investigador decida")
    write(s, 0.55, 1.5, 12, 0.35, "/protocols/…/revision/…", 16, VIOLET, bold=True)
    items = [
        ("Fuente", "Tipo de documento, referencia, fecha del dato y valor leído."),
        ("Decisión firme", "Sin fuente no se guarda. El revisor y su rol los fija la base."),
        ("Medicamentos", "Vigentes, lavado del protocolo y los que nadie verifica hace más de 30 días."),
        ("Bitácora", "De solo agregar. Una corrección es un registro nuevo."),
    ]
    for i, (title, body) in enumerate(items):
        col = i % 2
        row = i // 2
        x = 0.55 + col * 6.35
        y = 2.15 + row * 2.2
        rect(s, x, y, 6.05, 2.0, SOFT, radius=True)
        write(s, x + 0.28, y + 0.28, 5.5, 0.4, title, 18, INK, bold=True)
        write(s, x + 0.28, y + 0.85, 5.5, 0.85, body, 15, SLATE)

    # 9. Sigue
    s = prs.slides.add_slide(blank)
    chrome(s, "4  ·  SIGUE Y RECUPERA", "El screen failure es una fuga, no el final")
    rows = [
        ("/tracker", "Pre-screening, screening, randomizado, screen failure. Randomizado se marca cuando el IRT del patrocinador ya asignó."),
        ("/dashboard", "Embudo del site y meta de enrolamiento: al día, en riesgo o atrasada."),
        ("/rematch", "Si falló un estudio, lista protocolos activos donde ese paciente no está excluido."),
        ("/bitacora", "La bitácora de screening se exporta."),
    ]
    for i, (route, body) in enumerate(rows):
        y = 1.6 + i * 1.25
        rect(s, 0.55, y, 12.2, 1.12, SOFT, radius=True)
        write(s, 0.8, y + 0.18, 2.6, 0.75, route, 16, VIOLET, bold=True, anchor="middle")
        write(s, 3.5, y + 0.18, 8.9, 0.75, body, 15, SLATE, anchor="middle")

    # 10. Diario
    s = prs.slides.add_slide(blank)
    chrome(s, "5  ·  LA VISITA", "El diario sigue en Veeva o en Clinical Ink")
    write(s, 0.55, 1.5, 12, 0.7, "En la visita ya realizada, el coordinador anota lo que vio con el paciente. Crisvia guarda la revisión del site.", 16, SLATE)
    points = [
        ("Sistema y referencia", "Veeva, Clinical Ink, otro diario o papel, con sujeto, periodo o folio."),
        ("Cumplimiento", "Periodo, días esperados y completados, dosis omitidas."),
        ("Hallazgos", "Posible evento adverso y medicación nueva, cada uno con descripción."),
        ("Señales", "Bajo 80 %, dosis omitidas, evento que la visita no registró, o medicación nueva."),
    ]
    for i, (title, body) in enumerate(points):
        col = i % 2
        row = i // 2
        x = 0.55 + col * 6.35
        y = 2.4 + row * 2.15
        rect(s, x, y, 6.05, 1.95, SOFT, radius=True)
        write(s, x + 0.28, y + 0.25, 5.5, 0.4, title, 18, INK, bold=True)
        write(s, x + 0.28, y + 0.8, 5.5, 0.9, body, 15, SLATE)

    # 11. Confianza
    s = prs.slides.add_slide(blank)
    chrome(s, "CONFIANZA", "Cada centro ve solo lo suyo")
    trust = [
        ("Roles", "Investigador, sub-investigador, coordinador. El monitor lee."),
        ("Acceso", "MFA para el equipo clínico y sesión con vencimiento."),
        ("Rastro", "Bitácora de cambios. Equipo y delegación del protocolo, con vigencia."),
        ("Aislamiento", "Cada organización ve solo sus datos, en Postgres."),
    ]
    for i, (title, body) in enumerate(trust):
        y = 1.6 + i * 1.2
        rect(s, 0.55, y, 0.12, 0.95, VIOLET)
        write(s, 0.95, y, 11.5, 0.35, title, 18, INK, bold=True)
        write(s, 0.95, y + 0.4, 11.5, 0.5, body, 15, SLATE)
    write(s, 0.55, 6.55, 12.2, 0.4, "La certificación del diario y del EDC sigue en el sistema del patrocinador.", 14, MUTED)

    # 12. Modelo
    s = prs.slides.add_slide(blank)
    chrome(s, "MODELO", "SaaS por site, en dólares, sin implementación")
    plans = [
        ("Free", "$0", "14 días para probar", "Hasta 50 pacientes, 3 protocolos, 1 usuario."),
        ("Pro", "$149", "al mes, o $1,490 al año", "500 pacientes, 3 usuarios, Re-Match y portal."),
        ("Pro+", "$329", "al mes, o $3,290 al año", "2,000 pacientes, 10 usuarios, roles, MFA y bitácora."),
    ]
    for i, (name, price, cadence, body) in enumerate(plans):
        x = 0.55 + i * 4.2
        fill = VIOLET if i == 1 else SOFT
        title_c = WHITE if i == 1 else INK
        body_c = "EDE9FE" if i == 1 else SLATE
        price_c = WHITE if i == 1 else VIOLET
        rect(s, x, 1.7, 3.95, 4.7, fill, radius=True)
        write(s, x + 0.3, 1.95, 3.3, 0.4, name, 16, title_c, bold=True)
        write(s, x + 0.3, 2.5, 3.3, 0.7, price, 36, price_c, bold=True)
        write(s, x + 0.3, 3.3, 3.3, 0.4, cadence, 14, body_c)
        write(s, x + 0.3, 4.1, 3.3, 1.6, body, 16, body_c)
    write(s, 0.55, 6.6, 12.2, 0.35, "Precio por sitio. El año cobra 10 meses. Se cancela la renovación cuando el centro quiere.", 14, MUTED)

    # 13. Construido
    s = prs.slides.add_slide(blank)
    chrome(s, "LO QUE YA ESTÁ CONSTRUIDO", "Producto operable. Tracción por demostrar.")
    card(s, 0.55, 1.7, 6.05, 4.6, "Se puede recorrer hoy", "Portal, expediente, matcher, revisión con evidencia, tracker, Re-Match, visitas y revisión de diario en Veeva o Clinical Ink.\n\nLa base aísla centros y roles. Hay pruebas de ese aislamiento sobre Postgres.")
    card(s, 6.85, 1.7, 5.9, 4.6, "Abierto con esta sala", "Los primeros sites de diseño, el ciclo de venta al centro y el número de pacientes cruzados en producción.\n\nEsas cifras se dicen cuando existan.")

    # 14. Mercado
    s = prs.slides.add_slide(blank)
    chrome(s, "EL MERCADO", "México ya corre estudios. El software del site va atrás.")
    rect(s, 0.55, 1.7, 6.05, 4.6, SOFT, radius=True)
    write(s, 0.85, 2.0, 5.4, 0.4, "Estudios documentados", 16, VIOLET, bold=True)
    write(s, 0.85, 2.6, 5.4, 1.0, "~5,000", 48, INK, bold=True)
    write(s, 0.85, 3.7, 5.4, 1.8, "en México, abril de 2024.\nMás de 5,200 registrados hacia febrero de 2025, incluidos estudios ya cerrados.", 16, SLATE)
    rect(s, 6.85, 1.7, 5.9, 4.6, SOFT, radius=True)
    write(s, 7.15, 2.0, 5.3, 0.4, "El hueco", 16, VIOLET, bold=True)
    write(s, 7.15, 2.7, 5.3, 2.8, "El patrocinador estandarizó EDC y diario.\n\nEl coordinador del site sigue en hojas de cálculo.\n\nCrisvia entra ahí: un centro, muchos protocolos, los pacientes que ya atiende.", 16, SLATE)
    write(s, 0.55, 6.5, 12.2, 0.45, "Fuentes: UNAM / CIC, 2025; Statista, febrero 2025.", 12, MUTED)

    # 15. Pedido
    s = prs.slides.add_slide(blank)
    chrome(s, "PEDIDO A LA INCUBADORA", "Tres cosas, en este orden")
    asks = [
        ("1", "Tres sites piloto", "En México, para correr el trial de 14 días con un protocolo real y medir screen failures recuperados."),
        ("2", "Mentoría comercial", "Para venderle al director del site, no al patrocinador."),
        ("3", "Lectura regulatoria", "De una persona que ya operó un centro: qué documento exige el monitor y cuál se queda en Veeva."),
    ]
    for i, (n, title, body) in enumerate(asks):
        y = 1.65 + i * 1.7
        rect(s, 0.55, y, 12.2, 1.52, SOFT, radius=True)
        write(s, 0.85, y + 0.4, 0.6, 0.6, n, 26, VIOLET, bold=True)
        write(s, 1.7, y + 0.22, 10.5, 0.4, title, 20, INK, bold=True)
        write(s, 1.7, y + 0.72, 10.5, 0.6, body, 15, SLATE)

    # 16. Recorrido
    s = prs.slides.add_slide(blank)
    chrome(s, "FUNCIONAMIENTO  ·  4 MINUTOS", "Recorrido en vivo, con la app abierta")
    demo = [
        ("0:00", "/dashboard", "Embudo y si la meta de enrolamiento va al día."),
        ("0:30", "/candidatos", "Lead del portal. El contacto de ayer ya está anotado."),
        ("1:00", "Matcher", "Semáforo por reglas: verde, amarillo, rojo, con el criterio."),
        ("1:40", "Revisión", "Confirma el criterio contra el laboratorio y concilia medicamentos."),
        ("2:20", "/rematch", "Falló el estudio A. Estos otros protocolos todavía lo aceptan."),
        ("3:00", "Revisar diario", "Veeva o Clinical Ink. Aquí queda lo que el site revisó en la visita."),
    ]
    for i, (minute, screen, line) in enumerate(demo):
        y = 1.5 + i * 0.88
        write(s, 0.55, y, 1.1, 0.7, minute, 16, VIOLET, bold=True, anchor="middle")
        write(s, 1.8, y, 3.3, 0.7, screen, 16, INK, bold=True, anchor="middle")
        write(s, 5.2, y, 7.5, 0.7, line, 15, SLATE, anchor="middle")

    return prs


if __name__ == "__main__":
    build().save(OUT)
    print(OUT)
