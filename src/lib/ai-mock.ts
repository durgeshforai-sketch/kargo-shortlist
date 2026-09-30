/**
 * Dev-only stand-in for Gemini so the flow can be exercised without a key.
 * Keyword heuristics, clearly labelled in the UI. Refused in production (see ai.ts).
 */
const SIGNALS: Record<string, RegExp> = {
  PM1: /freight|logistic|warehouse|3pl|port|customs|carrier|supply chain|operations/gi,
  PM2: /built|created|prototype|adopted|from scratch|introduced/gi,
  PM3: /shipped|launched|killed|post-mortem|sunset|iterat/gi,
  PM4: /sole|owned|first pm|independently|without/gi,
  PM5: /product manager|startup|series a|seed|early-stage/gi,
  SPM1: /integration|api|edi|erp|platform|data pipeline|webhook/gi,
  SPM2: /decided|trade-off|call|ambigu|owned/gi,
  SPM3: /freight|logistic|port|supply chain|warehouse|customs/gi,
  SPM4: /framework|standard|process|practice|playbook|rituals?/gi,
  SPM5: /senior|lead|head|founding|early-stage/gi,
};

export function mockGenerate(kind: "assessment" | "brief" | "email", prompt: string): string {
  const cv = prompt.split('"""')[1] ?? "";
  if (kind === "brief") {
    return "[MOCK AI] The candidate ranks here on keyword overlap with the rubric only. The strongest signal is operations vocabulary in the CV. Test whether any of it was hands-on.";
  }
  if (kind === "email") {
    const invite = /INTERVIEW INVITE/.test(prompt);
    return JSON.stringify({
      subject: invite ? "[MOCK] Kargo — let's talk" : "[MOCK] Your Kargo application",
      body: `Hi {{first_name}},\n\n[MOCK AI draft — set GEMINI_API_KEY for a real one.] ${invite ? "I'd like to set up a 45-minute conversation next week." : "We're moving forward with other candidates for this role."}\n\nArjun Mehta\nFounder, Kargo`,
    });
  }
  const scores = Object.entries(SIGNALS).map(([code, re]) => {
    const hits = cv.match(re) ?? [];
    const idx = hits.length ? cv.search(new RegExp(re.source, "i")) : -1;
    const evidence = idx >= 0 ? cv.slice(Math.max(0, idx - 30), idx + 60).replace(/\s+/g, " ").trim() : "";
    return { code, score: Math.min(5, hits.length), evidence, reasoning: `[MOCK] ${hits.length} keyword hits.` };
  });
  const years = Number(cv.match(/(\d+(?:\.\d)?)\+?\s*years/i)?.[1] ?? 0);
  return JSON.stringify({
    headline: "[MOCK] keyword-scored profile",
    years_total: years,
    years_product: years,
    domains: [],
    red_flags: ["Mock AI: no real assessment"],
    closest_hire: "H7",
    closest_hire_reason: "[MOCK] placeholder",
    scores,
  });
}
