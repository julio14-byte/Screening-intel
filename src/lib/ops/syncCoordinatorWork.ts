import type { SupabaseClient } from "@supabase/supabase-js";
import type { CriterionResult } from "@/lib/types";
import { toPatientInitials } from "@/lib/utils";
import {
  dueAtForKind,
  openTaskKey,
  overdueDedupeKey,
  type TaskKind,
} from "@/lib/ops/model";

type OpenTask = {
  kind: TaskKind;
  sourceId: string;
  title: string;
  detail: string;
  initials: string;
  href: string;
  notify: { kind: "inbox_new" | "screen_failure"; title: string; body: string; href: string; dedupeKey: string } | null;
};

function firstRel<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function insertNotification(
  supabase: SupabaseClient,
  organizationId: string,
  input: { kind: string; title: string; body: string; href: string; dedupeKey: string }
) {
  const { error } = await supabase.from("app_notifications").insert({
    organization_id: organizationId,
    kind: input.kind,
    title: input.title,
    body: input.body,
    href: input.href,
    dedupe_key: input.dedupeKey,
  });
  if (error && error.code !== "23505") {
    throw new Error(error.message);
  }
}

async function ensureTask(
  supabase: SupabaseClient,
  organizationId: string,
  task: OpenTask
) {
  const { data: existing, error: readError } = await supabase
    .from("coordinator_tasks")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("kind", task.kind)
    .eq("source_id", task.sourceId)
    .maybeSingle();

  if (readError) throw new Error(readError.message);
  if (existing?.id) return { created: false as const };

  const { error } = await supabase.from("coordinator_tasks").insert({
    organization_id: organizationId,
    kind: task.kind,
    source_id: task.sourceId,
    title: task.title,
    detail: task.detail,
    initials: task.initials,
    href: task.href,
    status: "pending",
    due_at: dueAtForKind(task.kind),
  });

  if (error) {
    if (error.code === "23505") return { created: false as const };
    throw new Error(error.message);
  }

  if (task.notify) {
    await insertNotification(supabase, organizationId, task.notify);
  }

  return { created: true as const };
}

/** Materializa la cola en tareas y avisos. No reabre una tarea marcada hecha. */
export async function syncCoordinatorWork(
  supabase: SupabaseClient,
  organizationId: string
) {
  const [inboxRes, yellowRes, failRes] = await Promise.all([
    supabase
      .from("pre_screen_submissions")
      .select("id, first_name, last_name, created_at")
      .eq("organization_id", organizationId)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(40),
    supabase
      .from("screenings")
      .select(
        "id, patient_id, status, match_details, patients!inner(first_name, last_name, clinic_id), protocols(code_name)"
      )
      .in("status", ["pre_screening", "screening"])
      .eq("patients.clinic_id", organizationId)
      .limit(40),
    supabase
      .from("screenings")
      .select(
        "id, patient_id, status, patients!inner(first_name, last_name, clinic_id), protocols(code_name)"
      )
      .eq("status", "screen_failure")
      .eq("patients.clinic_id", organizationId)
      .limit(40),
  ]);

  if (inboxRes.error) throw new Error(inboxRes.error.message);
  if (yellowRes.error) throw new Error(yellowRes.error.message);
  if (failRes.error) throw new Error(failRes.error.message);

  const inboxRows = inboxRes.data ?? [];
  const yellowRows = yellowRes.data ?? [];
  const failRows = failRes.data ?? [];
  const truncated = {
    inbox: inboxRows.length >= 40,
    yellow: yellowRows.length >= 40,
    rematch: failRows.length >= 40,
  };
  const open: OpenTask[] = [];

  for (const row of inboxRows) {
    const initials = toPatientInitials(row.first_name, row.last_name);
    open.push({
      kind: "inbox",
      sourceId: row.id,
      title: `Revisar candidato ${initials}`,
      detail: "Inbox del portal. Convertir o archivar en /candidatos.",
      initials,
      href: "/candidatos",
      notify: {
        kind: "inbox_new",
        title: `Candidato nuevo ${initials}`,
        body: "Entró un pre-registro pendiente.",
        href: "/cola",
        dedupeKey: `inbox:${row.id}`,
      },
    });
  }

  for (const row of yellowRows) {
    const details = (row.match_details ?? []) as CriterionResult[];
    const missing = details
      .filter((item) => item.status === "missing")
      .map((item) => item.criterion)
      .slice(0, 4);
    if (missing.length === 0) continue;
    const patient = firstRel(
      row.patients as { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null
    );
    const protocol = firstRel(
      row.protocols as { code_name: string } | { code_name: string }[] | null
    );
    if (!patient) continue;
    const initials = toPatientInitials(patient.first_name, patient.last_name);
    open.push({
      kind: "yellow",
      sourceId: row.id,
      title: `Completar criterio de ${initials}`,
      detail: `${protocol?.code_name ?? "Protocolo"}: ${missing.join(", ")}`,
      initials,
      href: `/patients/${row.patient_id}`,
      notify: null,
    });
  }

  for (const row of failRows) {
    const patient = firstRel(
      row.patients as { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null
    );
    const protocol = firstRel(
      row.protocols as { code_name: string } | { code_name: string }[] | null
    );
    if (!patient) continue;
    const initials = toPatientInitials(patient.first_name, patient.last_name);
    const code = protocol?.code_name ?? "protocolo";
    open.push({
      kind: "rematch",
      sourceId: row.id,
      title: `Re-match de ${initials}`,
      detail: `Screen failure en ${code}.`,
      initials,
      href: "/rematch",
      notify: {
        kind: "screen_failure",
        title: `Screen failure ${initials}`,
        body: `Quedó fuera de ${code}. Revisar re-match.`,
        href: "/rematch",
        dedupeKey: `rematch:${row.id}`,
      },
    });
  }

  let created = 0;
  for (const task of open) {
    const result = await ensureTask(supabase, organizationId, task);
    if (result.created) created += 1;
  }

  const openKeys = new Set(open.map((task) => openTaskKey(task.kind, task.sourceId)));
  const { data: active, error: activeError } = await supabase
    .from("coordinator_tasks")
    .select("id, kind, source_id, status")
    .eq("organization_id", organizationId)
    .in("status", ["pending", "in_progress"]);

  if (activeError) throw new Error(activeError.message);

  let closed = 0;
  for (const task of active ?? []) {
    if (truncated[task.kind as keyof typeof truncated]) continue;
    if (openKeys.has(openTaskKey(task.kind, task.source_id))) continue;
    const { error } = await supabase
      .from("coordinator_tasks")
      .update({ status: "done" })
      .eq("id", task.id);
    if (error) throw new Error(error.message);
    closed += 1;
  }

  const now = new Date();
  const { data: overdue, error: overdueError } = await supabase
    .from("coordinator_tasks")
    .select("id, title, href")
    .eq("organization_id", organizationId)
    .in("status", ["pending", "in_progress"])
    .lt("due_at", now.toISOString())
    .limit(20);

  if (overdueError) throw new Error(overdueError.message);

  for (const task of overdue ?? []) {
    await insertNotification(supabase, organizationId, {
      kind: "task_overdue",
      title: "Tarea vencida",
      body: task.title,
      href: "/cola",
      dedupeKey: overdueDedupeKey(task.id, now),
    });
  }

  return { created, closed, open: open.length };
}
