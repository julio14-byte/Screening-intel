import { redirect } from "next/navigation";

/** Integraciones se retiró: no hay módulo de conectores en Crisvia. */
export default function RetiredIntegracionesPage() {
  redirect("/tracker");
}
