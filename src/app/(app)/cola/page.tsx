import { redirect } from "next/navigation";

/** La cola de trabajo se retiró: no se usaba. */
export default function RetiredColaPage() {
  redirect("/avisos");
}
