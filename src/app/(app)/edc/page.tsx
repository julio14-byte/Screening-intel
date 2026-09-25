import Link from "next/link";
import { FileSpreadsheet } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { PRODUCT_MODULES } from "@/lib/product/modules";

const EDC_LINKS = [
  {
    href: "/patients",
    title: "Expediente",
    body: "Perfil clínico, anamnesis, demografía y receta.",
  },
  {
    href: "/agenda",
    title: "Agenda",
    body: "Consultas con médico y notas clínicas.",
  },
  {
    href: "/seguimiento",
    title: "Seguimiento",
    body: "Visitas del protocolo con ventana, adherencia y desviaciones.",
  },
  {
    href: "/inventario",
    title: "Inventario",
    body: "Lotes de la farmacéutica y stock del site.",
  },
  {
    href: "/dispensacion",
    title: "Dispensación",
    body: "Caja IWRS, primera dosis y link del diario. El kit lo pide a /api/iwrs.",
  },
  {
    href: "/epro",
    title: "ePRO",
    body: "Invitación del coordinador al ePRO móvil y formularios de visita.",
  },
];

export default function EdcPage() {
  return (
    <>
      <PageHeader
        title="EDC"
        description={PRODUCT_MODULES.edc.summary}
      />
      <Card className="mb-4">
        <CardHeader
          title="Captura clínica del centro"
          description="Screening decide quién puede entrar. Este módulo registra lo que ocurre en visita. El IWRS (kit/brazo) se pide por API, no se calcula acá."
          actions={<FileSpreadsheet className="h-4 w-4 text-cyan-700" aria-hidden />}
        />
        <CardBody>
          <ul className="grid gap-3 sm:grid-cols-2">
            {EDC_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-lg border border-violet-100 px-3 py-3 hover:border-cyan-200 hover:bg-cyan-50/40"
                >
                  <p className="text-sm font-semibold text-indigo-950">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.body}</p>
                </Link>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </>
  );
}
