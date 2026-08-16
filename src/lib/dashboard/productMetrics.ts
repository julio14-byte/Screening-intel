import config from "@/config";
import { createAdminClient } from "@/lib/supabase/admin";
import type { User } from "@supabase/supabase-js";

function weekAgoIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}

export interface ProductMetrics {
  waitlistTotal: number;
  waitlistWeek: number;
  signupsTotal: number;
  signupsWeek: number;
  chatSessionsTotal: number;
  chatSessionsWeek: number;
}

/** ¿Puede este usuario ver métricas globales del producto? */
export function canViewProductMetrics(user: User | null): boolean {
  if (!config.productMetrics?.enabled) return false;
  if (!user) return false;

  const allowlist = config.productMetrics.founderEmails ?? [];
  if (allowlist.length === 0) return true;

  const email = user.email?.toLowerCase();
  return allowlist.some((e) => e.toLowerCase() === email);
}

/**
 * Métricas reales para pitch / tracción (requiere SUPABASE_SERVICE_ROLE_KEY).
 */
export async function getProductMetrics(): Promise<
  ProductMetrics | { error: string }
> {
  try {
    const supabase = createAdminClient();
    const since = weekAgoIso();

    const [
      waitlistAll,
      waitlistWeek,
      signupsAll,
      signupsWeek,
      chatAll,
      chatWeek,
    ] = await Promise.all([
      supabase.from("waitlist").select("*", { count: "exact", head: true }),
      supabase
        .from("waitlist")
        .select("*", { count: "exact", head: true })
        .gte("created_at", since),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", since),
      supabase
        .from("ai_conversations")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("ai_conversations")
        .select("*", { count: "exact", head: true })
        .gte("created_at", since),
    ]);

    const firstError =
      waitlistAll.error ||
      waitlistWeek.error ||
      signupsAll.error ||
      signupsWeek.error ||
      chatAll.error ||
      chatWeek.error;

    if (firstError) {
      return { error: firstError.message };
    }

    return {
      waitlistTotal: waitlistAll.count ?? 0,
      waitlistWeek: waitlistWeek.count ?? 0,
      signupsTotal: signupsAll.count ?? 0,
      signupsWeek: signupsWeek.count ?? 0,
      chatSessionsTotal: chatAll.count ?? 0,
      chatSessionsWeek: chatWeek.count ?? 0,
    };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "No se pudieron cargar las métricas.",
    };
  }
}

export function formatWeekTrend(count: number): string {
  if (!count) return "Sin nuevos en los últimos 7 días";
  return `+${count} en los últimos 7 días`;
}
