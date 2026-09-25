"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { readJsonResponse } from "@/lib/http/readJsonResponse";

type Row = {
  id: string;
  kit_code: string;
  protocol_code: string;
  arm_visible: boolean;
  arm_code: string | null;
  arm_name: string | null;
  unblinded_at: string | null;
};

export function PatientIwrsCard({ patientId }: { patientId: string }) {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    fetch("/api/iwrs")
      .then((res) =>
        readJsonResponse<{ assignments?: (Row & { patient_id: string })[] }>(res)
      )
      .then((json) => {
        setRows(
          (json?.assignments ?? []).filter((row) => row.patient_id === patientId)
        );
      })
      .catch(() => setRows([]));
  }, [patientId]);

  if (rows.length === 0) return null;

  return (
    <Card className="mt-6">
      <CardHeader
        title="IWRS"
        description="Kit de randomización de este sujeto. El brazo depende del cegamiento."
      />
      <CardBody>
        <ul className="space-y-2 text-sm">
          {rows.map((row) => (
            <li key={row.id} className="rounded-md border border-violet-100 px-3 py-2">
              <p className="font-mono text-xs text-violet-700">{row.kit_code}</p>
              <p className="text-indigo-950">{row.protocol_code}</p>
              <p className="text-xs text-slate-500">
                {row.arm_visible
                  ? `Brazo ${row.arm_code} · ${row.arm_name}`
                  : "Brazo oculto (estudio ciego)"}
              </p>
            </li>
          ))}
        </ul>
        <Link href="/iwrs" className="mt-3 inline-block text-xs font-medium text-sky-700">
          Abrir IWRS →
        </Link>
      </CardBody>
    </Card>
  );
}
