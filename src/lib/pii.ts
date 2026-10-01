/**
 * Separates personal details from CV content at ingestion.
 * Everything returned in `content` is safe to send to the AI; `personal` stays in Supabase.
 */

export interface Personal {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  links: string[];
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// Indian and international phone numbers: +91 98204 37810, 098204-37810, (022) 2345 6789 …
const PHONE_RE = /(?<!\d)(?:\+\d{1,3}[\s-]?)?(?:\(?\d{2,5}\)?[\s-]?)?\d{3,5}[\s-]?\d{4,5}(?!\d)/g;
const PERSONAL_LINK_RE =
  /\b(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com\/in|github\.com|leetcode\.com|behance\.net|flowcv\.me|medium\.com\/@?|twitter\.com|x\.com)\/?[^\s|·,;)]*/gi;

/** "pm_01_priya_krishnan.pdf" → "Priya Krishnan" */
export function nameFromFileName(fileName: string): string | null {
  const base = fileName.replace(/\.[a-z0-9]+$/i, "");
  const parts = base.split(/[_\-\s]+/).filter((p) => /^[a-z]+$/i.test(p) && !/^(s?pm|cv|resume)$/i.test(p));
  if (parts.length < 2) return null;
  return parts.map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase()).join(" ");
}

const NOT_A_NAME =
  /\b(manager|product|summary|synopsis|profile|engineer|lead|leader|senior|resume|skills?|competenc\w*|qualifications?|education|experience|college|university|institute|school|technolog\w*|academic|objective|contact|professional)\b/i;

/** A line near the top that is 2–4 alphabetic words (not a section heading) is treated as the name. */
function nameFromHeader(text: string): string | null {
  for (const line of text.split(/\r?\n/).slice(0, 4)) {
    const t = line.trim();
    if (/^[A-Za-z][A-Za-z.'-]+(?:\s+[A-Za-z][A-Za-z.'-]+){1,3}$/.test(t) && !NOT_A_NAME.test(t)) {
      return t.toLowerCase().replace(/\b\w/g, (ch) => ch.toUpperCase());
    }
  }
  return null;
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Matches the phone's last 10 digits with any spacing/dashes between them. */
function phonePattern(phone: string): RegExp | null {
  const digits = phone.replace(/\D/g, "").slice(-10);
  if (digits.length < 10) return null;
  return new RegExp(digits.split("").join("[\\s-]*"), "g");
}

function isPhone(candidate: string): boolean {
  const digits = candidate.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
}

export function separatePersonalDetails(rawText: string, fileName: string): { personal: Personal; content: string } {
  // Postgres text columns reject NUL; some PDF text layers contain it.
  const text = rawText.replace(/\u0000/g, "").replace(/\u00a0/g, " ");
  // Text layers sometimes glue an upper-case name onto the address ("REDDYsquad_5@…").
  const email = text.match(EMAIL_RE)?.[0]?.replace(/^[A-Z]{2,}(?=[a-z0-9])/, "").toLowerCase() ?? null;
  const phone = (text.match(PHONE_RE) ?? []).find(isPhone)?.trim() ?? null;
  const links = Array.from(new Set((text.match(PERSONAL_LINK_RE) ?? []).map((l) => l.trim()))).filter((l) => l.length > 12);
  // Prefer the CV header when the file name confirms it (it drops file-name noise like "test" or "final");
  // otherwise the file name is the more reliable source, and the header is the last resort.
  const fromFile = nameFromFileName(fileName);
  const fromHeader = nameFromHeader(text);
  const confirmed = fromHeader && fromFile && fromHeader.toLowerCase().split(" ").every((p) => fromFile.toLowerCase().split(" ").includes(p));
  const full_name = confirmed ? fromHeader : (fromFile ?? fromHeader);

  let content = text
    .replace(EMAIL_RE, "[EMAIL]")
    .replace(PERSONAL_LINK_RE, "[LINK]")
    .replace(PHONE_RE, (m) => (isPhone(m) ? "[PHONE]" : m));

  const pp = phone ? phonePattern(phone) : null;
  if (pp) content = content.replace(pp, "[PHONE]");

  // Remove the name and each of its parts (≥3 letters) wherever it appears.
  const names = new Set<string>();
  for (const n of [full_name, nameFromFileName(fileName)]) {
    if (!n) continue;
    names.add(n);
    for (const part of n.split(/\s+/)) if (part.length >= 3) names.add(part);
  }
  for (const n of [...names].sort((a, b) => b.length - a.length)) {
    content = content.replace(new RegExp(`\\b${escapeRe(n)}\\b`, "gi"), "[NAME]");
  }

  content = content
    .replace(/(\[(?:NAME|EMAIL|PHONE|LINK)\][\s|·•,⋄—-]*){2,}/g, "[CONTACT REMOVED] ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { personal: { full_name, email, phone, links }, content };
}

/** Throws if any personal detail would leak into a prompt. Called before every AI request. */
export function assertNoPersonalDetails(prompt: string, personal: Personal): void {
  const leaks: string[] = [];
  if (personal.email && prompt.toLowerCase().includes(personal.email.toLowerCase())) leaks.push("email");
  const pp = personal.phone ? phonePattern(personal.phone) : null;
  if (pp && pp.test(prompt)) leaks.push("phone");
  if (personal.full_name && new RegExp(`\\b${escapeRe(personal.full_name)}\\b`, "i").test(prompt)) leaks.push("name");
  for (const l of personal.links) if (prompt.includes(l)) leaks.push("link");
  if (leaks.length) throw new Error(`Privacy guard: blocked AI call containing ${leaks.join(", ")}`);
}
