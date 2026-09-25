"use client";

import { readJsonResponse } from "@/lib/http/readJsonResponse";
import { IWRS_API } from "@/lib/iwrs/paths";
import type { IwrsConfig, ProtocolArm } from "@/lib/iwrs/model";

export type IwrsCatalogAssignment = {
  id: string;
  screening_id: string;
  patient_id: string;
  protocol_id: string;
  kit_code: string;
  stratum: string;
  randomized_at: string;
  unblinded_at: string | null;
  arm_visible: boolean;
  arm_code: string | null;
  arm_name: string | null;
  patient_name: string;
  subject_code: string | null;
  protocol_code: string;
  assignment_source?: string;
  external_id?: string;
};

export type IwrsCatalog = {
  module?: string;
  version?: string;
  configs: IwrsConfig[];
  arms: ProtocolArm[];
  assignments: IwrsCatalogAssignment[];
  error?: string;
};

async function iwrsJson<T>(res: Response): Promise<T> {
  const json = await readJsonResponse<T & { error?: string }>(res);
  if (!res.ok) {
    throw new Error(json?.error ?? "Error del módulo IWRS.");
  }
  return json as T;
}

export async function fetchIwrsCatalog(protocolId?: string): Promise<IwrsCatalog> {
  const url = protocolId
    ? `${IWRS_API.catalog}?protocol_id=${encodeURIComponent(protocolId)}`
    : IWRS_API.catalog;
  const res = await fetch(url);
  const json = await iwrsJson<IwrsCatalog>(res);
  return {
    module: json.module,
    version: json.version,
    configs: json.configs ?? [],
    arms: json.arms ?? [],
    assignments: json.assignments ?? [],
  };
}

export async function postIwrsRandomize(screeningId: string) {
  const res = await fetch(IWRS_API.randomize, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ screening_id: screeningId }),
  });
  return iwrsJson<{ assignment?: unknown; error?: string }>(res);
}

export async function postIwrsSponsorKit(body: {
  screening_id: string;
  kit_code: string;
  external_id?: string;
  arm_id?: string | null;
}) {
  const res = await fetch(IWRS_API.sponsorRegister, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return iwrsJson<{ assignment?: unknown; error?: string }>(res);
}

export async function postIwrsUnblind(randomizationId: string, reason: string) {
  const res = await fetch(IWRS_API.unblind, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ randomization_id: randomizationId, reason }),
  });
  return iwrsJson<{ assignment?: unknown; error?: string }>(res);
}

export async function postIwrsConfig(body: unknown) {
  const res = await fetch(IWRS_API.config, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return iwrsJson<{ config?: IwrsConfig; error?: string }>(res);
}

export async function postIwrsArm(body: unknown) {
  const res = await fetch(IWRS_API.arms, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return iwrsJson<{ arm?: ProtocolArm; error?: string }>(res);
}
