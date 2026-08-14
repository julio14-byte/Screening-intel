"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function BillingPortalButton({
  label = "Administrar suscripción",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        credentials: "include",
      });

      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "No se pudo abrir el portal.");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al conectar con Stripe.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="secondary"
        onClick={handleClick}
        disabled={loading}
        className={className}
      >
        {loading ? "Abriendo…" : label}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-rose-600">{error}</p>
      ) : null}
    </div>
  );
}
