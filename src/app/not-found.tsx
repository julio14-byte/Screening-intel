import Link from "next/link";
import config from "@/config";
import { routes } from "@/lib/app/routes";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-950 via-violet-950 to-fuchsia-950 px-4 text-center text-white">
      <p className="text-6xl font-bold text-violet-300">404</p>
      <h1 className="mt-4 text-2xl font-semibold">Página no encontrada</h1>
      <p className="mt-2 max-w-md text-violet-200">
        La URL no existe en {config.app.name}. Revisa el menú o vuelve al tablero.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href={routes.landing}>
          <Button variant="secondary">Landing</Button>
        </Link>
        <Link href={routes.app.dashboard}>
          <Button>Tablero Central</Button>
        </Link>
      </div>
    </div>
  );
}
