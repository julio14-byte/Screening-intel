# Cumplimiento regulatorio en México

Mapa de normas para vender Crisvia a centros de investigación clínica. No es asesoría legal: confirma la postura con un abogado sanitario y de datos personales antes de firmar con clientes.

## COFEPRIS: dispositivo médico

| Pregunta | Respuesta |
|----------|-----------|
| ¿Es dispositivo médico? | Lo es el software con propósito médico (diagnóstico, tratamiento, monitoreo, apoyo a decisiones clínicas). NOM-241-SSA1-2021 definición 3.109 y Ley General de Salud art. 262 y 376. |
| Postura de Crisvia | Software administrativo de screening: registro de pacientes, elegibilidad contra criterios del protocolo, agenda y fecha de entrega. No diagnostica, no recomienda tratamiento ni calcula dosis. Una presentación de COFEPRIS (2022) sobre software lista el registro de pacientes y la planeación de visitas entre los ejemplos que no son software como dispositivo médico. |
| Qué la rompe | Presentar un resultado como diagnóstico, recomendación terapéutica, dosis o decisión clínica. Mantén el texto comercial y la interfaz en "criterios de elegibilidad del protocolo". |
| Si algún día aplica | Clase II o III según regla 16 del Apéndice II de la FEUM, registro sanitario y NOM-241 (diseño y validación de software), NOM-137 (etiquetado) y NOM-240 (tecnovigilancia). |

Antes de vender, solicita a COFEPRIS una opinión por escrito sobre la clasificación o, como mínimo, archiva un dictamen interno firmado con el uso previsto.

## Normas que aplican al centro cliente (y que el comprador te va a exigir)

| Norma | Qué exige al centro | Qué debe darle Crisvia |
|-------|--------------------|------------------------|
| NOM-012-SSA3-2012 y Reglamento de la LGS en materia de investigación | Protocolo autorizado, comité de ética en investigación registrado en CONBIOÉTICA, consentimiento informado, expediente del estudio | Trazabilidad por paciente y protocolo, acceso por rol, sin sustituir el consentimiento del estudio |
| NOM-004-SSA3-2012 (expediente clínico) | Confidencialidad y conservación del expediente | Crisvia no es el expediente clínico; no reemplaza el del centro |
| NOM-024-SSA3-2012 (SIRES) | Certificación DGIS solo para sistemas de registro electrónico de salud que intercambian información según las GIIS | Crisvia no es SIRES; si un cliente la usa como tal, exigirá la certificación |
| LFPDPPP (reforma 2025) | Aviso de privacidad, consentimiento expreso y por escrito para datos de salud, medidas de seguridad, aviso de vulneraciones, derechos ARCO | Aviso en `/privacidad`, consentimiento expreso en el pre-registro con fecha (`consent_at`), contrato de encargado, controles técnicos de `docs/security.md` |

La autoridad de datos personales para particulares es ahora la Secretaría Anticorrupción y Buen Gobierno.

## Contrato con cada centro

1. Contrato de encargado: el centro es Responsable, Crisvia es Encargado. Solo trata datos bajo instrucciones, guarda confidencialidad, aplica medidas equivalentes, no subcontrata sin autorización y devuelve o suprime los datos al terminar.
2. Lista de subencargados (Supabase, Vercel, OpenAI, Stripe) y regiones de alojamiento.
3. Plazo para avisar al centro de una vulneración y responsable de contacto.
4. Retención, exportación y supresión de datos al cancelar.
5. Declaración de uso previsto: herramienta administrativa de screening, no dispositivo médico.

## Evidencia de seguridad que piden los compradores

- Resumen de controles (`docs/security.md`) y resultados de `yarn verify:security`.
- Pentest externo anual y reporte de remediación.
- Plan de respuesta a incidentes y de continuidad (`docs/BACKUP.md`).
- Siguiente nivel comercial: SOC 2 Tipo I o ISO/IEC 27001. Es una certificación de la organización; el código por sí solo no la otorga.

## Inteligencia artificial y datos personales

- Todo texto que sale hacia el proveedor de IA pasa por `redactIdentifiers` (`src/lib/privacy/redact.ts`): correo, teléfono, CURP, RFC, identificadores etiquetados (NSS, expediente, folio), fecha de nacimiento etiquetada, direcciones y nombres (los del paciente y los precedidos de título o etiqueta). Se conservan laboratorios, medicamentos y fechas clínicas.
- El enmascarado es heurístico: reduce el riesgo, no garantiza anonimato. Nombres sueltos sin etiqueta solo se detectan si se pasan como nombres conocidos.
- Toda llamada pasa por `src/lib/ai/openai.ts`, que envía `store: false` y ningún identificador de usuario.
- La elegibilidad la calcula el motor de reglas. La IA solo extrae datos de texto y redacta la explicación del resultado.
- El proveedor puede conservar las solicitudes un tiempo limitado para detectar abuso. Solicita retención cero o un acuerdo equivalente antes de enviar datos reales, y añade al proveedor a la lista de subencargados del contrato.
