"use client";

import { use } from "react";
import { ChartReviewView } from "@/components/chart-review/ChartReviewView";

export default function ChartReviewPage({
  params,
}: {
  params: Promise<{ id: string; patientId: string }>;
}) {
  const { id, patientId } = use(params);
  return <ChartReviewView protocolId={id} patientId={patientId} />;
}
