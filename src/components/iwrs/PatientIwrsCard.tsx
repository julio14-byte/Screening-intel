"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { fetchIwrsCatalog, type IwrsCatalogAssignment } from "@/lib/iwrs/client";

export function PatientIwrsCard({ patientId }: { patientId: string }) {
  const [rows, setRows] = useState<IwrsCatalogAssignment[]>([]);

  useEffect(() => {
    void Promise.resolve()
      .then(() => fetchIwrsCatalog())
      .then((json) => {
        setRows(json.assignments.filter((row) => row.patient_id === patientId));
      })
      .catch(() => setRows([]));
  }, [patientId]);

  if (rows.length === 0) return null;

  return (
    <Card className="mt-6">
      <CardHeader
        title="IWRS"
        description="Kit vía /api/iwrs. El brazo depende del cegamiento."
      />
      <CardBody>
        <ul className="space-y-2 text-sm">
          {rows.map((row) => (
            <li key={row.id} className="rounded-md border border-violet-100 px-3 py-2">
              <p className="font-mono text-xs text-violet-700">{row.kit_code}</p>
              <p className="text-indigo-950">{row.protocol_code}</p>
              <p className="text-xs text-slate-500">
                {row.assignment_source === "sponsor"
                  ? `IRT del sponsor${row.external_id ? ` · ${row.external_id}` : ""}`
                  : "IWRS del centro"}
              </p>
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
