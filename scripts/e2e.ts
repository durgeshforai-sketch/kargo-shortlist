import "./load-env";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

/**
 * Checkpoint B·1 acceptance test against a running app (npm run dev, or BASE_URL=https://…).
 * Uploads 3 CVs: a clear strong PM, a clear weak SPM, and an ambiguous one. Then checks the database:
 * personal details stored, CV content free of them, both rubrics scored, ranking, brief + drafts, nothing sent.
 * Test rows are deleted at the end (KEEP=1 to keep them).
 */
const base = process.env.BASE_URL ?? "http://localhost:3000";
const folder = process.env.CV_DIR ?? "../resumes_";
const auth: Record<string, string> = process.env.DASHBOARD_PASSWORD ? { authorization: `Basic ${btoa(`arjun:${process.env.DASHBOARD_PASSWORD}`)}` } : {};
const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

const CASES = [
  { file: "pm_03_deepika_nair.pdf", role: "PM", label: "strong PM" },
  { file: "spm_27_gaurav_yadav.pdf", role: "SPM", label: "weak SPM" },
  { file: "pm_08_nishant_joshi.pdf", role: "PM", label: "ambiguous" },
] as const;

let failures = 0;
const check = (ok: boolean, msg: string) => {
  console.log(`  ${ok ? "✓" : "✕"} ${msg}`);
  if (!ok) failures++;
};

const ids: string[] = [];
try {
  for (const c of CASES) {
    const fd = new FormData();
    fd.append("file", new Blob([readFileSync(join(folder, c.file))]), c.file);
    fd.append("role", c.role);
    const res = await fetch(`${base}/api/candidates`, { method: "POST", body: fd, headers: auth });
    const json = await res.json();
    if (!res.ok) throw new Error(`${c.file}: ${json.error}`);
    ids.push(json.id);
  }
  for (let i = 0; i < 10; i++) {
    const r = await (await fetch(`${base}/api/drafts`, { method: "POST", headers: auth })).json();
    if (r.remaining === 0 || r.done === 0) break;
  }

  const { data: rows } = await db.from("candidates").select("*").in("id", ids);
  const { data: scores } = await db.from("criterion_scores").select("*").in("candidate_id", ids);
  const { data: all } = await db.from("candidates").select("id,applied_role,pm_score,spm_score").eq("status", "scored");

  for (const [i, c] of CASES.entries()) {
    const row = rows!.find((r) => r.id === ids[i])!;
    console.log(`\n${c.label} — ${c.file}: PM ${row.pm_score} · SPM ${row.spm_score} · tier ${row.tier} · ${row.email_kind}`);
    check(row.status === "scored", "row created and scored");
    check(!!row.full_name && !!row.email, `personal details stored (${row.full_name}, ${row.email})`);
    const leak = [row.full_name, row.email, row.phone].filter(Boolean).some((v: string) => row.cv_content.toLowerCase().includes(v.toLowerCase()));
    check(!leak, "CV content has no name / email / phone");
    check(row.pm_score !== null && row.spm_score !== null, "both PM and SPM scores exist");
    const mine = scores!.filter((s) => s.candidate_id === row.id);
    check(mine.length === 10 && mine.every((s) => s.reasoning), "10 criterion scores, each with reasoning");
    check(!!row.email_body && row.email_status === "draft", "draft email generated, not sent");
    check(row.email_body?.includes("{{first_name}}") || !row.email_body?.includes(row.full_name), "draft uses a name placeholder, not the real name");
    if (row.tier === "interview") check(!!row.brief && row.brief.split(/(?<=[.!?])\s+/).length <= 4, "interview-tier brief present (~3 sentences)");
    const rankedRole = (all ?? []).filter((x) => x.applied_role === row.applied_role).sort((a, b) =>
      (row.applied_role === "PM" ? b.pm_score - a.pm_score : b.spm_score - a.spm_score));
    console.log(`    rank ${rankedRole.findIndex((x) => x.id === row.id) + 1} of ${rankedRole.length} ${row.applied_role}`);
  }
  const strong = rows!.find((r) => r.id === ids[0])!;
  const weak = rows!.find((r) => r.id === ids[1])!;
  check(strong.pm_score > weak.spm_score, "strong PM outscores weak SPM on their applied roles");
  check(rows!.every((r) => r.email_status !== "sent"), "no email was sent");
} finally {
  if (!process.env.KEEP && ids.length) {
    await db.from("candidates").delete().in("id", ids);
    console.log(`\nCleaned up ${ids.length} test rows.`);
  }
}
console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
