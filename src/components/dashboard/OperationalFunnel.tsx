"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { buildOperationalFunnel } from "@/lib/ops/model";
import { cn } from "@/lib/utils";
import type { ScreeningWithRelations } from "@/lib/types";

export function OperationalFunnel({
  screenings,
}: {
  screenings: ScreeningWithRelations[];
}) {
  const [capture, setCapture] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadCapture() {
      const { getSupabaseClient } = await import("@/lib/supabase/client");
      const supabase = getSupabaseClient();
      const { count } = await supabase
        .from("pre_screen_submissions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (!cancelled) setCapture(count ?? 0);
    }
    void loadCapture();
    return () => {
      cancelled = true;
    };
  }, [screenings.length]);

  const funnel = buildOperationalFunnel({
    capture,
    preScreening: screenings.filter((row) => row.status === "pre_screening").length,
    screening: screenings.filter((row) => row.status === "screening").length,
    randomized: screenings.filter((row) => row.status === "randomized").length,
    recover: screenings.filter((row) => row.status === "screen_failure").length,
  });
  const max = Math.max(1, ...funnel.stages.map((stage) => stage.count), funnel.recover.count);

  return (
    <div id="embudo" className="mb-5">
    <Card>
      <CardHeader
        title="Embudo operativo"
        description="Captación, avance del screening y, al lado, quienes hay que recuperar."
      />
      <CardBody className="space-y-3">
        {funnel.stages.map((stage) => (
          <Link key={stage.key} href={stage.href} className="block">
            <div className="mb-1 flex items-center justify-between text-xs text-indigo-800">
              <span>{stage.label}</span>
              <span className="font-semibold tabular-nums">{stage.count}</span>
            </div>
            <div className="h-2 rounded-full bg-violet-100">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                style={{ width: `${Math.max(8, Math.round((stage.count / max) * 100))}%` }}
              />
            </div>
          </Link>
        ))}
        <Link
          href={funnel.recover.href}
          className={cn(
            "mt-2 flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
          )}
        >
          <span>{funnel.recover.label}</span>
          <span className="font-semibold tabular-nums">{funnel.recover.count}</span>
        </Link>
      </CardBody>
    </Card>
    </div>
  );
}
