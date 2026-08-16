"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

/** Espera a que el cliente SSR lea la sesión de las cookies antes de consultar datos. */
export function useSupabaseReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();

    void supabase.auth.getSession().finally(() => setReady(true));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => setReady(true));

    return () => subscription.unsubscribe();
  }, []);

  return ready;
}
