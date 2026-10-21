"use client";

import { useEffect, useState } from "react";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import type { SiteProfile } from "@/lib/site/profile";

/** Datos propios del centro; `null` mientras cargan o si no hay perfil legible. */
export function useSiteProfile(): { site: SiteProfile | null; loading: boolean } {
  const [site, setSite] = useState<SiteProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settings/site");
        const json = await readJsonResponse<{ profile?: SiteProfile }>(res);
        if (!cancelled && res.ok && json?.profile) setSite(json.profile);
      } catch {
        /* el informe sigue sin encabezado del centro */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { site, loading };
}
