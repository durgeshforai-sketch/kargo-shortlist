const tokens = (s: string) =>
  s
    .toLowerCase()
    .replace(/\[(name|email|phone|link|contact removed)\]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w.length > 2);

/** 5-word shingles, for near-duplicate CV detection. */
export function shingles(text: string): Set<string> {
  const w = tokens(text);
  const out = new Set<string>();
  for (let i = 0; i + 5 <= w.length; i++) out.add(w.slice(i, i + 5).join(" "));
  return out;
}

export function similarity(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const s of a) if (b.has(s)) inter++;
  return inter / (a.size + b.size - inter);
}

export const DUPLICATE_THRESHOLD = 0.8;

export async function contentHash(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(tokens(text).join(" ")));
  return Buffer.from(buf).toString("hex");
}
