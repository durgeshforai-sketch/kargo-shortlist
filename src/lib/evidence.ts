const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9%₹$]+/g, " ").trim();

/**
 * True when the AI's quote actually appears in the CV (whitespace/punctuation-insensitive).
 * Long quotes pass if any 8-word window matches, to tolerate small AI trims.
 */
export function evidenceInCv(evidence: string, cv: string): boolean {
  const e = norm(evidence);
  if (e.split(" ").length < 3) return false;
  const c = norm(cv);
  if (c.includes(e)) return true;
  const words = e.split(" ");
  for (let i = 0; i + 8 <= words.length; i++) if (c.includes(words.slice(i, i + 8).join(" "))) return true;
  return false;
}

/** A score with no verifiable evidence is "claimed but unsupported": capped at 1. */
export const UNVERIFIED_CAP = 1;
