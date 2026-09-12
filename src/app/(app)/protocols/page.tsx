"use client";

import Link from "next/link";
import { useState } from "react";
import { Archive, FlaskConical, Play, Target } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/StateMessage";
import { CriteriaSummary } from "@/components/protocols/CriteriaSummary";
import { NewProtocolModal } from "@/components/protocols/NewProtocolModal";
import { RoleGuard } from "@/components/rbac/RoleGuard";
import { useProtocols } from "@/hooks/useProtocols";
import { cn } from "@/lib/utils";

export default function ProtocolsPage() {
  const { protocols, loading, error, addProtocol, setProtocolStatus } =
    useProtocols();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="Protocol Matcher"
        description="Protocolos con criterios estructurados. Se guardan en el idioma del sponsor (p. ej. inglés). Selecciona uno para cruzarlo contra pacientes."
        actions={
          <RoleGuard permission="protocols:write">
            <Button onClick={() => setModalOpen(true)}>
              <FlaskConical className="h-4 w-4" aria-hidden />
              Nuevo protocolo
            </Button>
          </RoleGuard>
        }
      />

      {loading ? (
        <LoadingState label="Cargando protocolos…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : protocols.length === 0 ? (
        <Card>
          <EmptyState
            title="Todavía no hay protocolos"
            description="Da de alta un protocolo con sus criterios de inclusión y exclusión para empezar a matchear pacientes."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {protocols.map((protocol) => (
            <Card key={protocol.id}>
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600">
                      {protocol.code_name}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium",
                        protocol.status === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      )}
                    >
                      {protocol.status === "active" ? "Activo" : "Cerrado"}
                    </span>
                  </div>
                  <h2 className="mt-1.5 text-sm font-semibold text-slate-900 break-words">
                    {protocol.title}
                  </h2>
                  <div className="mt-2">
                    <CriteriaSummary protocol={protocol} />
                  </div>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:shrink-0 sm:flex-row sm:items-center">
                  <RoleGuard permission="protocols:write">
                    <Button
                      variant="secondary"
                      className="w-full justify-center sm:w-auto"
                      onClick={() =>
                        setProtocolStatus(
                          protocol.id,
                          protocol.status === "active" ? "closed" : "active"
                        )
                      }
                    >
                      {protocol.status === "active" ? (
                        <>
                          <Archive className="h-4 w-4" aria-hidden />
                          Cerrar
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" aria-hidden />
                          Reactivar
                        </>
                      )}
                    </Button>
                  </RoleGuard>
                  <Link
                    href={`/protocols/${protocol.id}/match`}
                    className="w-full sm:w-auto"
                  >
                    <Button className="w-full justify-center sm:w-auto">
                      <Target className="h-4 w-4" aria-hidden />
                      <span className="sm:hidden">Matching</span>
                      <span className="hidden sm:inline">Ejecutar matching</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <NewProtocolModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={addProtocol}
      />
    </>
  );
}
