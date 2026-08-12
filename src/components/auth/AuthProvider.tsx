"use client";

import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

interface AuthContextValue {
  session: Session | null;
  /** true mientras se resuelve la sesión inicial. */
  loading: boolean;
  /** Mensaje si faltan las variables de entorno de Supabase. */
  configError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  /** Devuelve true si la cuenta quedó pendiente de confirmación por email. */
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;

    // Deferido a una microtarea para no llamar setState de forma síncrona
    // dentro del efecto (regla react-hooks/set-state-in-effect).
    void Promise.resolve().then(() => {
      try {
        const supabase = getSupabaseClient();
        void supabase.auth.getSession().then(({ data }) => {
          if (!cancelled) {
            setSession(data.session);
            setLoading(false);
          }
        });
        const { data } = supabase.auth.onAuthStateChange((_event, next) => {
          if (!cancelled) {
            setSession(next);
            setLoading(false);
          }
        });
        subscription = data.subscription;
      } catch (e) {
        if (!cancelled) {
          setConfigError(
            e instanceof Error ? e.message : "Error de configuración"
          );
          setLoading(false);
        }
      }
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    // Sin sesión => el proyecto exige confirmar el email antes de ingresar.
    return data.session === null;
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo(
    () => ({ session, loading, configError, signIn, signUp, signOut }),
    [session, loading, configError, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
