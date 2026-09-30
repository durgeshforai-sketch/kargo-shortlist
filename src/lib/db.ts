import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";
import type { Candidate, Criterion, CriterionScore, Role } from "./types";

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (!client) {
    client = createClient(requireEnv("supabaseUrl", "SUPABASE_URL"), requireEnv("supabaseKey", "SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false },
    });
  }
  return client;
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function getCriteria(role?: Role): Promise<Criterion[]> {
  let q = db().from("rubric_criteria").select("*").order("role").order("position");
  if (role) q = q.eq("role", role);
  const rows = check(await q) as Criterion[];
  if (!rows.length) throw new Error("Rubric not seeded: run `npm run seed:rubric`");
  return rows;
}

export async function getRubricDocument(): Promise<string | null> {
  const row = check(await db().from("rubric_document").select("body").eq("id", 1).maybeSingle()) as { body: string } | null;
  return row?.body ?? null;
}

export async function listCandidates(role?: Role): Promise<Candidate[]> {
  let q = db().from("candidates").select("*").order("created_at");
  if (role) q = q.eq("applied_role", role);
  return check(await q) as Candidate[];
}

export async function getCandidate(id: string): Promise<Candidate | null> {
  return check(await db().from("candidates").select("*").eq("id", id).maybeSingle()) as Candidate | null;
}

export async function getScores(candidateId: string): Promise<CriterionScore[]> {
  return check(await db().from("criterion_scores").select("*").eq("candidate_id", candidateId)) as CriterionScore[];
}

export async function insertCandidate(row: Partial<Candidate>): Promise<Candidate> {
  return check(await db().from("candidates").insert(row).select("*").single()) as Candidate;
}

export async function updateCandidate(id: string, patch: Partial<Candidate>): Promise<Candidate> {
  return check(await db().from("candidates").update(patch).eq("id", id).select("*").single()) as Candidate;
}

export async function replaceScores(candidateId: string, scores: CriterionScore[]): Promise<void> {
  check(await db().from("criterion_scores").delete().eq("candidate_id", candidateId));
  if (scores.length) check(await db().from("criterion_scores").insert(scores.map((s) => ({ ...s, candidate_id: candidateId }))));
}

export async function logActivity(candidateId: string | null, kind: string, detail?: string): Promise<void> {
  await db().from("activity").insert({ candidate_id: candidateId, kind, detail: detail ?? null });
}

export async function listActivity(limit = 30): Promise<{ at: string; kind: string; detail: string | null; candidate_id: string | null }[]> {
  return check(await db().from("activity").select("at,kind,detail,candidate_id").order("at", { ascending: false }).limit(limit)) as never;
}
