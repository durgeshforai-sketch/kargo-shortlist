import type { Criterion, Role } from "./types";

/**
 * Parses the "STEP 3 — RUBRIC" section of rubric.txt.
 * Criterion lines look like: `PM1 | Name | 25 | Description`.
 */
export function parseRubric(text: string): Criterion[] {
  const out: Criterion[] = [];
  const counters: Record<Role, number> = { PM: 0, SPM: 0 };
  for (const raw of text.split(/\r?\n/)) {
    const m = raw.match(/^(S?PM)(\d+)\s*\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|\s*(.+)$/);
    if (!m) continue;
    const role = m[1] as Role;
    out.push({
      code: `${role}${m[2]}`,
      role,
      name: m[3],
      weight: Number(m[4]),
      description: m[5].trim(),
      position: ++counters[role],
    });
  }
  validateRubric(out);
  return out;
}

export function validateRubric(criteria: Criterion[]): void {
  for (const role of ["PM", "SPM"] as Role[]) {
    const rows = criteria.filter((c) => c.role === role);
    if (rows.length < 4 || rows.length > 6) throw new Error(`${role} rubric needs 4–6 criteria, found ${rows.length}`);
    const total = rows.reduce((s, c) => s + c.weight, 0);
    if (total !== 100) throw new Error(`${role} rubric weights add to ${total}, not 100`);
  }
}

/** Weighted total out of 100: sum(score/5 × weight). */
export function weightedTotal(criteria: Criterion[], scores: { code: string; score: number }[]): number {
  let total = 0;
  for (const c of criteria) {
    const s = scores.find((x) => x.code === c.code)?.score ?? 0;
    total += (Math.max(0, Math.min(5, s)) / 5) * c.weight;
  }
  return Math.round(total * 10) / 10;
}
