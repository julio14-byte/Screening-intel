import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PRODUCT_MODULES, PRODUCT_MODULE_IDS } from "@/lib/product/modules";

/** Atajos a los cinco módulos, sin copy de producto. */
export function ProductModulesStrip() {
  return (
    <Card className="h-full">
      <CardHeader
        title="Ir al screening"
        description="Registro, matcher, tracker y re-match."
      />
      <CardBody className="p-2">
        <ul className="divide-y divide-violet-50">
          {PRODUCT_MODULE_IDS.map((id) => {
            const mod = PRODUCT_MODULES[id];
            return (
              <li key={id}>
                <Link
                  href={mod.href}
                  className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-2.5 text-sm text-indigo-950 hover:bg-violet-50"
                >
                  <span className="font-medium">{mod.label.replace(/^\d+\.\s/, "")}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-violet-400" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}
