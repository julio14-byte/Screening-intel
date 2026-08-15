"use client";

import { usePathname } from "next/navigation";
import config from "@/config";
import { AppShell } from "@/components/layout/AppShell";
import type { ReactNode } from "react";

const STANDALONE_PATHS = new Set([
  config.auth.loginUrl,
  config.auth.landingUrl,
]);

export function AuthLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (STANDALONE_PATHS.has(pathname)) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
