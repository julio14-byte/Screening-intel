"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/StateMessage";
import { routes } from "@/lib/app/routes";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 p-8">
      <ErrorState
        message={
          error.message ||
          "Ocurrió un error inesperado. Puedes reintentar o volver al inicio."
        }
      />
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={reset}>
          Reintentar
        </Button>
        <Link href={routes.app.dashboard}>
          <Button variant="secondary">Ir al dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
