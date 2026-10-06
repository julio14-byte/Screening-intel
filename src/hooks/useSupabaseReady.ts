"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

/** Espera a que el cliente SSR lea la sesión de las cookies antes de consultar datos. */
export function useSupabaseReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    try {
      const supabase = getSupabaseClient();

      void supabase.auth.getSession().finally(() => {
        if (!cancelled) setReady(true);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(() => {
        if (!cancelled) setReady(true);
      });

      return () => {
        cancelled = true;
        subscription.unsubscribe();
      };
    } catch {
      setReady(true);
      return () => {
        cancelled = true;
      };
    }
  }, []);

  return ready;
}
