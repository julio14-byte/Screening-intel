"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { EPRO_IDLE_MS } from "@/lib/epro-app/constants";

export function EproIdleGuard({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    async function logout() {
      await fetch("/api/epro-app/p/sesion", { method: "DELETE" });
      router.replace("/epro-app/entrar");
    }

    function bump() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void logout();
      }, EPRO_IDLE_MS);
    }

    bump();
    const windowEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "touchstart",
    ];
    const onEvent = () => {
      if (document.visibilityState === "hidden") return;
      bump();
    };
    windowEvents.forEach((name) =>
      window.addEventListener(name, onEvent, { passive: true })
    );
    document.addEventListener("visibilitychange", onEvent);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      windowEvents.forEach((name) => window.removeEventListener(name, onEvent));
      document.removeEventListener("visibilitychange", onEvent);
    };
  }, [enabled, router]);

  return null;
}
