import type { Metadata } from "next";
import Link from "next/link";
import config from "@/config";

export const metadata: Metadata = {
  title: `Aviso de Privacidad · ${config.app.name}`,
  robots: { index: true, follow: true },
};

const sections: { title: string; items: string[] }[] = [
  {
    title: "Datos personales que se tratan",
    items: [
      "Identificación y contacto: nombre, fecha de nacimiento, sexo, correo electrónico y teléfono.",
      "Datos personales sensibles de salud: diagnósticos, antecedentes, medicamentos, estudios de laboratorio y mediciones clínicas.",
    ],
  },
  {
    title: "Finalidades que requieren tu consentimiento expreso",
    items: [
      "Evaluar si podrías cumplir los criterios de inclusión y exclusión de estudios clínicos del centro.",
      "Contactarte para confirmar tu información, agendar visitas y dar seguimiento.",
      "Si tu evaluación no resulta compatible con un estudio, volver a evaluarte en otros estudios del mismo centro solo cuando lo hayas autorizado por separado.",
    ],
  },
  {
    title: "Transferencias",
    items: [
      "Tus datos no se comparten con patrocinadores ni terceros sin tu autorización por escrito, salvo las excepciones previstas en la ley.",
      "El proveedor de la plataforma y su infraestructura tratan los datos únicamente por cuenta y bajo instrucciones del centro.",
    ],
  },
  {
    title: "Limitar el uso o retirar tu consentimiento",
    items: [
      "Puedes retirar tu consentimiento o limitar el uso de tus datos en cualquier momento, sin efectos retroactivos, escribiendo al contacto indicado abajo.",
    ],
  },
  {
    title: "Derechos ARCO",
    items: [
      "Puedes solicitar acceso, rectificación, cancelación u oposición respecto de tus datos. La solicitud debe indicar tu nombre, un medio para responderte, la descripción clara de los datos y un documento que acredite tu identidad.",
      "El centro responde en un máximo de veinte días desde que recibe la solicitud. El ejercicio de estos derechos es gratuito.",
    ],
  },
  {
    title: "Cambios al aviso",
    items: [
      "Cualquier cambio se publica en esta página con su fecha de actualización.",
    ],
  },
];

export default function PrivacidadPage() {
  const { entityName, address, privacyEmail, privacyNoticeUpdated } = config.legal;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/50 to-violet-50">
      <header className="border-b border-violet-100 bg-white/90">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-sm font-semibold text-indigo-950">
            {config.brand.logoText}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold text-indigo-950">
          Aviso de Privacidad Integral
        </h1>
        <p className="mt-1 text-xs text-violet-600">
          Última actualización: {privacyNoticeUpdated}
        </p>

        <section className="mt-8">
          <h2 className="text-base font-semibold text-indigo-950">
            Responsable
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-indigo-900">
            El centro de investigación clínica al que envías tu pre-registro es
            el responsable del tratamiento de tus datos personales.
            {config.app.name} actúa como encargado de la plataforma.
          </p>
          {(entityName || address) && (
            <p className="mt-2 text-sm text-indigo-900">
              {[entityName, address].filter(Boolean).join(" · ")}
            </p>
          )}
        </section>

        {sections.map((section) => (
          <section key={section.title} className="mt-8">
            <h2 className="text-base font-semibold text-indigo-950">
              {section.title}
            </h2>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-indigo-900">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}

        {privacyEmail && (
          <section className="mt-8">
            <h2 className="text-base font-semibold text-indigo-950">Contacto</h2>
            <p className="mt-2 text-sm text-indigo-900">
              <a
                href={`mailto:${privacyEmail}`}
                className="font-medium underline underline-offset-2"
              >
                {privacyEmail}
              </a>
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
