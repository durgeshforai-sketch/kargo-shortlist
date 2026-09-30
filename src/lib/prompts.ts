import { PAST_HIRES } from "./hires";
import type { Criterion, Role } from "./types";
import { ROLE_LABEL } from "./types";

const HOUSE_RULES = `You work for Arjun Mehta, founder of Kargo (Series A, Mumbai; software for freight forwarders and 3PLs).
You rank and explain. Arjun decides. Never invent facts that are not in the CV text.
The CV has been anonymised: [NAME], [EMAIL], [PHONE], [LINK] and [CONTACT REMOVED] are placeholders. Never guess who the candidate is.`;

export function assessmentPrompt(criteria: Criterion[], cvContent: string): string {
  const block = (role: Role) =>
    criteria
      .filter((c) => c.role === role)
      .map((c) => `- ${c.code} "${c.name}" (weight ${c.weight}%): ${c.description}`)
      .join("\n");
  const hires = PAST_HIRES.map((h) => `- ${h.key} [${h.label.split("·")[1].trim()}]: ${h.profile}`).join("\n");

  return `${HOUSE_RULES}

TASK: Extract a short profile from the CV and score it against BOTH rubrics below, whichever role was applied for.

Scale per criterion (integer 0–5):
5 = strong, specific evidence (numbers, a named artefact, adoption by others)
3 = some evidence, partial or generic
1 = claimed but unsupported
0 = no evidence

Arjun's instinct, learned from his past hires: people who worked on an operations floor before building for it,
who built fixes nobody asked for that others adopted, who owned outcomes with no layer above them, and who say plainly what failed.
ANTI-SIGNAL: certifications, frameworks, conference talks, brand-name schools/employers and buzzwords earn ZERO points by themselves.
Score only demonstrated outcomes.

PRODUCT MANAGER rubric:
${block("PM")}

SENIOR PRODUCT MANAGER rubric:
${block("SPM")}

Arjun's past hires (anonymised), for "closest_hire":
${hires}

For every criterion return:
- "evidence": a VERBATIM quote of at most 25 words copied exactly from the CV that supports the score, or "" if none
- "reasoning": one sentence on why that score, not higher

Also return "red_flags": up to 3 short things Arjun should probe in an interview (gaps, vague claims, level mismatch).

CV (anonymised):
"""
${cvContent.slice(0, 14000)}
"""`;
}

export const assessmentSchema = {
  type: "object",
  properties: {
    headline: { type: "string", description: "Under 12 words, e.g. 'Ex-3PL ops analyst, 2 yrs sole PM in port SaaS'" },
    years_total: { type: "number" },
    years_product: { type: "number" },
    domains: { type: "array", items: { type: "string" }, maxItems: 5 },
    red_flags: { type: "array", items: { type: "string" }, maxItems: 3 },
    closest_hire: { type: "string", enum: PAST_HIRES.map((h) => h.key) },
    closest_hire_reason: { type: "string" },
    scores: {
      type: "array",
      items: {
        type: "object",
        properties: {
          code: { type: "string" },
          score: { type: "integer", minimum: 0, maximum: 5 },
          evidence: { type: "string" },
          reasoning: { type: "string" },
        },
        required: ["code", "score", "evidence", "reasoning"],
      },
    },
  },
  required: ["headline", "years_total", "years_product", "domains", "red_flags", "closest_hire", "closest_hire_reason", "scores"],
};

export function briefPrompt(input: {
  role: Role;
  rank: number;
  score: number;
  cvContent: string;
  scoreLines: string;
  redFlags: string[];
}): string {
  return `${HOUSE_RULES}

TASK: Write Arjun's interview brief for a ${ROLE_LABEL[input.role]} candidate ranked #${input.rank} (score ${input.score}/100).
Exactly 3 sentences, plain text, no bullet points, no preamble. Refer to them as "the candidate".
Sentence 1: why they rank here, in Kargo terms.
Sentence 2: the single strongest piece of evidence from the CV.
Sentence 3: the one thing Arjun must test in the interview.

Rubric scores:
${input.scoreLines}

Things to probe: ${input.redFlags.join("; ") || "none flagged"}

CV (anonymised):
"""
${input.cvContent.slice(0, 10000)}
"""`;
}

export function emailPrompt(input: { kind: "invite" | "rejection"; role: Role; cvContent: string; strengths: string }): string {
  const job = ROLE_LABEL[input.role];
  const ask =
    input.kind === "invite"
      ? `an INTERVIEW INVITE for the ${job} role. Mention one specific thing from their CV that made Arjun want to talk. Ask for 2–3 slots next week for a 45-minute conversation at the Mumbai office (video is fine for a first round).`
      : `a respectful REJECTION for the ${job} role. Be warm and specific (name one genuine strength), honest that the team is moving forward with candidates whose background is closer to what the role needs right now, and do not promise future roles. No clichés like "we received many applications".`;
  return `${HOUSE_RULES}

TASK: Draft ${ask}
Write as Arjun, in first person, under 140 words, plain text. Start with "Hi {{first_name}}," exactly — the real name is filled in only at send time.
Sign off: "Arjun Mehta\\nFounder, Kargo".

What stood out in the CV: ${input.strengths}

CV (anonymised):
"""
${input.cvContent.slice(0, 6000)}
"""`;
}

export const emailSchema = {
  type: "object",
  properties: { subject: { type: "string" }, body: { type: "string" } },
  required: ["subject", "body"],
};
