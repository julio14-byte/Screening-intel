import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function CandidatoPortalClosed() {
  return (
    <div className="rounded-xl border border-violet-100 bg-white p-6 text-sm text-indigo-900">
      <p className="text-lg font-semibold text-indigo-950">
        El pre-registro público todavía no está abierto
      </p>
      <p className="mt-2 leading-relaxed text-indigo-700">
        Este centro todavía no recibe formularios por internet. Si ya tienes una cita,
        el coordinador te contacta por el medio que te indicaron.
      </p>
      <div className="mt-4">
        <Link href="/login">
          <Button variant="secondary">Acceso coordinadores</Button>
        </Link>
      </div>
    </div>
  );
}
