"use client";

import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { createSiteUserAction } from "@/actions/rbac";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SelectInput, TextInput } from "@/components/ui/Field";
import {
  APP_ROLE_LABELS,
  type AppRole,
} from "@/lib/rbac/types";

const ROLES: AppRole[] = ["investigator", "coordinator", "monitor"];

export function CreateSiteUserForm({ onCreated }: { onCreated?: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [clinicalRole, setClinicalRole] = useState<AppRole>("coordinator");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await createSiteUserAction({
        email,
        password,
        fullName,
        clinicalRole,
      });

      if (result.ok) {
        setSuccess(`Usuario ${result.email} creado correctamente.`);
        setEmail("");
        setPassword("");
        setFullName("");
        setClinicalRole("coordinator");
        onCreated?.();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Card className="mb-6">
      <CardHeader
        title="Crear usuario del sitio"
        description="Alta de personal con acceso a la app y rol clínico asignado."
        actions={<UserPlus className="h-4 w-4 text-slate-400" aria-hidden />}
      />
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Nombre completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej: María González"
              required
              autoComplete="name"
            />
            <TextInput
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@clinica.com"
              required
              autoComplete="off"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Contraseña temporal"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
              autoComplete="new-password"
              hint="Compartila de forma segura; el usuario puede cambiarla después."
            />
            <SelectInput
              label="Rol clínico"
              value={clinicalRole}
              onChange={(e) => setClinicalRole(e.target.value as AppRole)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {APP_ROLE_LABELS[r]}
                </option>
              ))}
            </SelectInput>
          </div>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              {success}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              <UserPlus className="h-4 w-4" aria-hidden />
              {pending ? "Creando…" : "Crear usuario"}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
