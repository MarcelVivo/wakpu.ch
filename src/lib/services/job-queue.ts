import "server-only";
import { getAdminSupabase } from "@/lib/supabase/admin";

export interface WorkerJob {
  id: string;
  kind: string;
  order_id: string;
  payload: Record<string, unknown>;
  status: string;
  attempt_count: number;
  max_attempts: number;
  dedupe_key: string;
  locked_by: string;
  locked_until: string;
}

export async function claimJobs(workerId: string, kinds: string[]): Promise<WorkerJob[]> {
  const { data, error } = await getAdminSupabase().rpc("claim_jobs", {
    p_worker_id: workerId, p_limit: 5, p_lease_seconds: 300, p_kinds: kinds,
  });
  if (error) throw new Error("Aufträge konnten nicht reserviert werden.");
  return (data ?? []) as WorkerJob[];
}

export async function finishJob(job: WorkerJob): Promise<void> {
  const { data, error } = await getAdminSupabase().rpc("complete_job", { p_job_id: job.id, p_worker_id: job.locked_by });
  if (error || !data) throw new Error("Auftragsreservierung abgelaufen.");
}

export async function deferJob(job: WorkerJob, seconds = 300): Promise<void> {
  const { data, error } = await getAdminSupabase().rpc("defer_job", { p_job_id: job.id, p_worker_id: job.locked_by, p_seconds: seconds });
  if (error || !data) throw new Error("Auftrag konnte nicht verschoben werden.");
}

export async function failJob(job: WorkerJob, errorText: string, permanent = false): Promise<void> {
  const { data, error } = await getAdminSupabase().rpc(permanent ? "park_job" : "fail_job", {
    p_job_id: job.id, p_worker_id: job.locked_by, p_error: errorText.slice(0, 500),
  });
  if (error || !data) throw new Error("Auftragsfehler konnte nicht gespeichert werden.");
}

export async function enqueueEmail(kind: string, orderId: string, dedupeKey: string, payload: Record<string, unknown> = {}): Promise<void> {
  const { error } = await getAdminSupabase().from("jobs").upsert({
    kind, order_id: orderId, dedupe_key: dedupeKey, payload,
  }, { onConflict: "dedupe_key", ignoreDuplicates: true });
  if (error) throw new Error("E-Mail-Auftrag konnte nicht gespeichert werden.");
}
