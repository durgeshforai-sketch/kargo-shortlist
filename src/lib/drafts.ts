import "server-only";
import { runBrief, runEmail } from "./ai";
import { getCriteria, getScores, listCandidates, logActivity, updateCandidate } from "./db";
import { personalOf } from "./pipeline";
import { briefPrompt, emailPrompt } from "./prompts";
import { INTERVIEW_SLOTS, ROLES, roleScore, type Candidate, type Role } from "./types";

/** Ranked list for one role (by applied role), best first. */
export function rankForRole(all: Candidate[], role: Role): Candidate[] {
  return all
    .filter((c) => c.applied_role === role && c.status === "scored")
    .sort((a, b) => (roleScore(b, role) ?? 0) - (roleScore(a, role) ?? 0) || a.created_at.localeCompare(b.created_at));
}

/** The tier the system proposes; a founder override always wins. */
function proposedTier(c: Candidate, rank: number): "interview" | "decline" {
  if (c.tier_source === "founder" && c.tier) return c.tier;
  return rank <= INTERVIEW_SLOTS ? "interview" : "decline";
}

/**
 * Brings tiers, briefs and email drafts in line with the current ranking.
 * Does at most `budget` AI calls per run so it fits a serverless time limit; returns what is left.
 * Never touches an email that has already been sent.
 */
export async function syncDrafts(budget = 6): Promise<{ done: number; remaining: number }> {
  const all = await listCandidates();
  const criteria = await getCriteria();
  let done = 0;
  let remaining = 0;

  for (const role of ROLES) {
    const ranked = rankForRole(all, role);
    for (const [i, c] of ranked.entries()) {
      const rank = i + 1;
      const tier = proposedTier(c, rank);
      const kind = tier === "interview" ? "invite" : "rejection";
      const patch: Partial<Candidate> = {};
      if (c.tier !== tier) patch.tier = tier;

      const needsBrief = tier === "interview" && !c.brief;
      const needsEmail = c.email_status !== "sent" && (c.email_kind !== kind || !c.email_body);
      if (!needsBrief && !needsEmail) {
        if (patch.tier) await updateCandidate(c.id, patch);
        continue;
      }
      if (done >= budget) {
        remaining++;
        if (patch.tier) await updateCandidate(c.id, patch);
        continue;
      }

      const scores = await getScores(c.id);
      const roleCriteria = criteria.filter((x) => x.role === role);
      const scoreLines = roleCriteria
        .map((cr) => {
          const s = scores.find((x) => x.code === cr.code);
          return `- ${cr.name} (${cr.weight}%): ${s?.score ?? 0}/5 — ${s?.reasoning ?? ""}`;
        })
        .join("\n");
      const strengths = [...scores]
        .filter((s) => roleCriteria.some((cr) => cr.code === s.code) && s.evidence_verified)
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)
        .map((s) => s.evidence)
        .join(" | ");
      const personal = personalOf(c);

      try {
        if (needsBrief) {
          patch.brief = await runBrief(
            briefPrompt({ role, rank, score: roleScore(c, role) ?? 0, cvContent: c.cv_content, scoreLines, redFlags: c.red_flags }),
            personal,
          );
          done++;
        }
        if (needsEmail) {
          const draft = await runEmail(emailPrompt({ kind, role, cvContent: c.cv_content, strengths: strengths || c.headline || "" }), personal);
          patch.email_kind = kind;
          patch.email_subject = draft.subject;
          patch.email_body = draft.body;
          patch.email_status = "draft";
          patch.email_error = null;
          done++;
        }
        await updateCandidate(c.id, patch);
        await logActivity(c.id, "drafted", `${kind}${patch.brief ? " + brief" : ""}`);
      } catch (e) {
        await updateCandidate(c.id, { ...patch, email_error: (e as Error).message });
        remaining++;
      }
    }
  }
  return { done, remaining };
}
