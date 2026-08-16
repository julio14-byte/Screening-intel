import { redirect } from "next/navigation";
import { routes } from "@/lib/app/routes";

/** Redirige facturación legacy a Configuración */
export default function BillingRedirectPage() {
  redirect(routes.app.settings);
}
