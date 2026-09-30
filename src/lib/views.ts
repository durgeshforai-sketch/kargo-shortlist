import { rankForRole } from "./drafts";
import { INTERVIEW_SLOTS, roleScore, type Candidate, type Role } from "./types";

export interface RankedRow {
  c: Candidate;
  rank: number;
  score: number | null;
  otherScore: number | null;
  /** Strong enough for the other role to rank in its interview slots. */
  crossRoleFit: boolean;
}

export function otherRole(role: Role): Role {
  return role === "PM" ? "SPM" : "PM";
}

export function rankedRows(all: Candidate[], role: Role): RankedRow[] {
  const other = otherRole(role);
  const otherRanked = rankForRole(all, other);
  const otherCutoff = roleScore(otherRanked[INTERVIEW_SLOTS - 1] ?? { pm_score: 0, spm_score: 0 }, other) ?? 0;
  return rankForRole(all, role).map((c, i) => {
    const score = roleScore(c, role);
    const otherScore = roleScore(c, other);
    return {
      c,
      rank: i + 1,
      score,
      otherScore,
      crossRoleFit: (otherScore ?? 0) >= (score ?? 0) + 10 && (otherScore ?? 0) > otherCutoff,
    };
  });
}
