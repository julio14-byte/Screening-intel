/** Bloques permutados para IWRS. No toca el motor de matching. */

export type IwrsBlinding = "open" | "single" | "double";

export const IWRS_BLINDING_LABEL: Record<IwrsBlinding, string> = {
  open: "Abierto (todos ven el brazo)",
  single: "Simple ciego (brazo solo PI / sub)",
  double: "Doble ciego (brazo oculto hasta desenlace)",
};

export type ProtocolArm = {
  id: string;
  organization_id: string;
  protocol_id: string;
  code: string;
  name: string;
  allocation_weight: number;
  sort_order: number;
  created_at: string;
};

export type IwrsConfig = {
  protocol_id: string;
  organization_id: string;
  enabled: boolean;
  blinding: IwrsBlinding;
  block_size: number;
  stratify_gender: boolean;
  updated_at?: string;
};

export type IwrsAssignment = {
  id: string;
  organization_id: string;
  protocol_id: string;
  patient_id: string;
  screening_id: string;
  stratum: string;
  kit_code: string;
  randomized_at: string;
  randomized_by: string;
  unblinded_at: string | null;
  unblinded_by: string | null;
  unblind_reason: string;
  arm_id?: string | null;
  arm_code?: string | null;
  arm_name?: string | null;
  arm_visible: boolean;
};

function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) return 0;
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.getRandomValues) {
    const buf = new Uint32Array(1);
    cryptoObj.getRandomValues(buf);
    return buf[0] % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
}

export function normalizeBlockSize(
  arms: Pick<ProtocolArm, "allocation_weight">[],
  preferred: number
): number {
  const weightSum = arms.reduce((sum, arm) => sum + arm.allocation_weight, 0);
  if (weightSum <= 0) {
    throw new Error("Los brazos necesitan un peso de asignación ≥ 1.");
  }
  const copies = Math.max(1, Math.round(preferred / weightSum));
  return weightSum * copies;
}

/** Una permutación de un bloque: p.ej. 1:1 y tamaño 4 → dos de cada brazo, barajados. */
export function buildPermutedBlock(
  arms: Pick<ProtocolArm, "id" | "allocation_weight">[],
  preferredBlockSize: number
): string[] {
  if (arms.length < 2) {
    throw new Error("IWRS necesita al menos dos brazos.");
  }
  const blockSize = normalizeBlockSize(arms, preferredBlockSize);
  const weightSum = arms.reduce((sum, arm) => sum + arm.allocation_weight, 0);
  const copies = blockSize / weightSum;
  const list: string[] = [];
  for (const arm of arms) {
    for (let i = 0; i < arm.allocation_weight * copies; i += 1) {
      list.push(arm.id);
    }
  }
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    const current = list[i];
    list[i] = list[j];
    list[j] = current;
  }
  return list;
}

export function allocationRatioLabel(
  arms: Pick<ProtocolArm, "code" | "allocation_weight">[]
): string {
  if (!arms.length) return "—";
  return arms.map((arm) => `${arm.allocation_weight}`).join(":") +
    " (" +
    arms.map((arm) => arm.code).join(":") +
    ")";
}

export function isNeedBlockError(message: string | undefined): boolean {
  return Boolean(message && /NEED_BLOCK/i.test(message));
}

export function isMissingIwrsSchema(message: string | undefined): boolean {
  if (!message) return false;
  const mentionsIwrs =
    /protocol_iwrs_config|protocol_arms|iwrs_slots|iwrs_randomizations|iwrs_arm_assignments|iwrs_randomize|iwrs_append_block|iwrs_unblind|iwrs_arm_visible/i.test(
      message
    );
  const missing =
    /does not exist|schema cache|could not find|PGRST205|PGRST200/i.test(
      message
    );
  return mentionsIwrs && missing;
}
