import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import config from "@/config";
import { getUser } from "@/lib/supabase/server";

/** Zona privada — layout VibeFast (app) con shell de la aplicación. */
export default async function AppGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect(config.auth.loginUrl);

  return <AppShell>{children}</AppShell>;
}
