"use client";

import { ShieldCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { logInclusionApprovalAction } from "@/actions/audit";
import { RoleGuard } from "@/components/rbac/RoleGuard";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export function InclusionApprovalPanel({
  patientId,
  protocolId = "general",
  criterion = "Criterios de inclusión verificados",
}: {
  patientId: string;
  protocolId?: string;
  criterion?: string;
}) {
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <RoleGuard allowedRoles={["investigator"]}>
      <Card className="mt-6">
        <CardHeader
          title="Aprobación médica (Investigador Principal)"
          description="Registra la firma / aprobación del criterio de inclusión en la bitácora inmutable."
          actions={<ShieldCheck className="h-4 w-4 text-violet-500" aria-hidden />}
        />
        <CardBody className="space-y-3">
          <label className="block text-xs font-medium text-slate-600">
            Notas de aprobación (opcional)
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Ej: Revisado en consulta presencial, cumple criterio de edad y diagnóstico."
            />
          </label>

          {message ? (
            <p className="text-xs text-emerald-700">{message}</p>
          ) : null}
          {error ? <p className="text-xs text-red-600">{error}</p> : null}

          <Button
            disabled={pending}
            onClick={() => {
              setMessage(null);
              setError(null);
              startTransition(async () => {
                const result = await logInclusionApprovalAction({
                  patientId,
                  protocolId,
                  criterion,
                  notes: notes || undefined,
                });
                if (result.ok) {
                  setMessage("Aprobación registrada en audit trail.");
                  setNotes("");
                } else {
                  setError(result.error);
                }
              });
            }}
          >
            <ShieldCheck className="h-4 w-4" aria-hidden />
            {pending ? "Registrando…" : "Aprobar criterio de inclusión"}
          </Button>
        </CardBody>
      </Card>
    </RoleGuard>
  );
}
