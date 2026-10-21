"use client";

import { useCallback, useEffect, useState } from "react";
import { readJsonResponse } from "@/lib/http/readJsonResponse";
import { toErrorMessage } from "@/lib/errors";
import type { Delegation, DelegationInput, StaffInput, StaffMember } from "@/lib/team/team";

async function send<T>(url: string, method: string, body: unknown, fallback: string): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await readJsonResponse<T & { error?: string }>(res);
  if (!res.ok || !json) throw new Error(json?.error ?? fallback);
  return json;
}

export function useTeam() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/team");
      const json = await readJsonResponse<{
        staff?: StaffMember[];
        delegations?: Delegation[];
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo cargar el equipo.");
      setStaff(json?.staff ?? []);
      setDelegations(json?.delegations ?? []);
      setError(null);
    } catch (e) {
      setError(toErrorMessage(e, "No se pudo cargar el equipo."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveStaff = useCallback(
    async (input: StaffInput) => {
      await send<{ staff: StaffMember }>("/api/team/staff", "PUT", input, "No se pudo guardar.");
      await load();
    },
    [load]
  );

  const addDelegation = useCallback(
    async (input: DelegationInput) => {
      await send<{ delegation: Delegation }>(
        "/api/team/delegations",
        "POST",
        input,
        "No se pudo registrar la delegación."
      );
      await load();
    },
    [load]
  );

  const endDelegation = useCallback(
    async (id: string, endedOn: string) => {
      await send<{ delegation: Delegation }>(
        "/api/team/delegations",
        "PATCH",
        { id, ended_on: endedOn },
        "No se pudo cerrar la delegación."
      );
      await load();
    },
    [load]
  );

  return { staff, delegations, loading, error, saveStaff, addDelegation, endDelegation };
}
