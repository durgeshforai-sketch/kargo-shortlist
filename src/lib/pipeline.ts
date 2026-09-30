import "server-only";
import { runAssessment } from "./ai";
import { getCandidate, getCriteria, insertCandidate, listCandidates, logActivity, replaceScores, updateCandidate } from "./db";
import { contentHash, DUPLICATE_THRESHOLD, shingles, similarity } from "./dedupe";
import { evidenceInCv, UNVERIFIED_CAP } from "./evidence";
import { fileToText } from "./parse-file";
import { separatePersonalDetails, type Personal } from "./pii";
import { assessmentPrompt } from "./prompts";
import { weightedTotal } from "./rubric";
import type { Candidate, CriterionScore, Role } from "./types";

export function personalOf(c: Pick<Candidate, "full_name" | "email" | "phone" | "links">): Personal {
  return { full_name: c.full_name, email: c.email, phone: c.phone, links: c.links ?? [] };
}

/** Component map, System row: extract + separate personal details, then score against both rubrics. */
export async function ingestCv(fileName: string, bytes: Uint8Array, role: Role): Promise<Candidate> {
  const raw = await fileToText(fileName, bytes);
  if (raw.replace(/\s/g, "").length < 200) throw new Error("Could not read enough text from this file (is it a scanned image?)");
  const { personal, content } = separatePersonalDetails(raw, fileName);

  const hash = await contentHash(content);
  const mine = shingles(content);
  let duplicateOf: string | null = null;
  for (const other of await listCandidates()) {
    if (other.content_hash === hash || similarity(mine, shingles(other.cv_content)) >= DUPLICATE_THRESHOLD) {
      duplicateOf = other.id;
      break;
    }
  }

  const candidate = await insertCandidate({
    applied_role: role,
    file_name: fileName,
    ...personal,
    cv_content: content,
    content_hash: hash,
    duplicate_of: duplicateOf,
    status: "processing",
  });
  await logActivity(candidate.id, "uploaded", `${fileName} → ${role}${duplicateOf ? " (near-duplicate CV)" : ""}`);
  return scoreCandidate(candidate.id);
}

export async function scoreCandidate(id: string): Promise<Candidate> {
  const c = await getCandidate(id);
  if (!c) throw new Error("Candidate not found");
  try {
    const criteria = await getCriteria();
    const a = await runAssessment(assessmentPrompt(criteria, c.cv_content), personalOf(c));

    const scores: CriterionScore[] = criteria.map((cr) => {
      const s = a.scores.find((x) => x.code === cr.code);
      const evidence = s?.evidence?.trim() || null;
      const verified = !!evidence && evidenceInCv(evidence, c.cv_content);
      const raw = s?.score ?? 0;
      return {
        code: cr.code,
        score: verified ? raw : Math.min(raw, UNVERIFIED_CAP),
        evidence,
        evidence_verified: verified,
        reasoning: s?.reasoning ?? "Not scored by the model.",
      };
    });
    await replaceScores(id, scores);

    const updated = await updateCandidate(id, {
      status: "scored",
      error: null,
      headline: a.headline,
      years_total: a.years_total,
      years_product: a.years_product,
      domains: a.domains,
      red_flags: a.red_flags,
      closest_hire: a.closest_hire,
      closest_hire_reason: a.closest_hire_reason,
      pm_score: weightedTotal(criteria.filter((x) => x.role === "PM"), scores),
      spm_score: weightedTotal(criteria.filter((x) => x.role === "SPM"), scores),
    });
    await logActivity(id, "scored", `PM ${updated.pm_score} · SPM ${updated.spm_score}`);
    return updated;
  } catch (e) {
    const msg = (e as Error).message;
    await logActivity(id, "error", msg);
    return updateCandidate(id, { status: "error", error: msg });
  }
}
