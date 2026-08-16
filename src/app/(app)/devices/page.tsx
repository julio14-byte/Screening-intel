"use client";

import { Cpu, Wifi, WifiOff } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";

/** Datos simulados hasta integrar telemetría ESP32 en Supabase. */
const MOCK_DEVICES = [
  {
    id: "esp32-screening-01",
    label: "Sensor vitales · Sala screening",
    status: "online" as const,
    lastSeen: "Hace 2 min",
    battery: 87,
  },
  {
    id: "esp32-screening-02",
    label: "Monitor ECG · Cohorte oncología",
    status: "online" as const,
    lastSeen: "Hace 5 min",
    battery: 62,
  },
  {
    id: "esp32-lab-bridge",
    label: "Bridge laboratorio · ESP32",
    status: "offline" as const,
    lastSeen: "Hace 3 h",
    battery: 12,
  },
];

export default function DevicesPage() {
  return (
    <>
      <PageHeader
        title="Dispositivos Hardware"
        description="Estatus de sensores ESP32 conectados al research site (vista simulada)."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MOCK_DEVICES.map((device) => (
          <Card key={device.id}>
            <CardHeader
              title={device.label}
              description={device.id}
            />
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-indigo-500">
                  Conexión
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                    device.status === "online"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  )}
                >
                  {device.status === "online" ? (
                    <Wifi className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <WifiOff className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {device.status === "online" ? "En línea" : "Desconectado"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-indigo-500">Último ping</span>
                <span className="text-indigo-900">{device.lastSeen}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-indigo-500">Batería</span>
                <span className="font-medium tabular-nums text-indigo-900">
                  {device.battery}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-violet-100">
                <div
                  className={cn(
                    "h-full rounded-full",
                    device.battery > 40 ? "bg-emerald-500" : "bg-amber-500"
                  )}
                  style={{ width: `${device.battery}%` }}
                />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardBody className="flex items-start gap-3 p-4 text-sm text-indigo-600">
          <Cpu className="mt-0.5 h-5 w-5 shrink-0 text-violet-500" aria-hidden />
          <p>
            Integración ESP32 pendiente: los dispositivos se registrarán en
            Supabase con telemetría en tiempo real (conexión, batería y última
            muestra clínica).
          </p>
        </CardBody>
      </Card>
    </>
  );
}
