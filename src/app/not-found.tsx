import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <SearchX className="h-10 w-10 text-slate-300" aria-hidden />
      <h1 className="text-lg font-semibold text-slate-900">
        Página no encontrada
      </h1>
      <p className="max-w-sm text-sm text-slate-500">
        La ruta que intentaste abrir no existe. Volvé al panel para seguir
        trabajando.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800"
      >
        Ir al panel general
      </Link>
    </div>
  );
}
