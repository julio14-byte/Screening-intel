"use client";

import { useState } from "react";
import config from "@/config";
import { routes } from "@/lib/app/routes";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import { Button } from "@/components/ui/Button";

export function CheckoutButton({
  planId = "pro",
  label = "Suscribirse",
  className,
}: {
  planId?: string;
  label?: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(routes.apis.stripeCheckout, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const data = await readJsonResponse<{ url?: string; error?: string }>(res);
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "No se pudo iniciar el checkout.");
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
        onClick={handleClick}
        disabled={loading}
        className={className}
      >
        {loading ? "Redirigiendo…" : label}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-rose-600">{error}</p>
      ) : null}
    </div>
  );
}
