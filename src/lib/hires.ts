/**
 * Arjun's past hires, as anonymised one-line profiles (no names, emails or phones).
 * Used to tell Arjun which past hire a candidate most resembles. Only the codename and
 * profile go to the AI; the codename is what we show.
 */
export const PAST_HIRES = [
  { key: "H1", label: "Hire 1 · Senior engineer (rated high)", profile: "Ex customs-house operations executive at a port who became a backend engineer on a freight tracking platform; built tools unprompted that were adopted team-wide; works with ops users with no product layer." },
  { key: "H2", label: "Hire 2 · Operations (rated high)", profile: "Freight documentation and customs compliance specialist turned independent ops consultant; redesigned workflows over a weekend when a vendor broke them; SOPs adopted in full." },
  { key: "H3", label: "Hire 3 · Product Manager (rated low)", profile: "Post-MBA PM at a Series B HR-tech SaaS; many certifications and talks; shipped many assigned roadmap features inside a 4-PM team; no operations or logistics exposure." },
  { key: "H4", label: "Hire 4 · Enterprise sales (rated high)", profile: "Started in port terminal sales at JNPT, then enterprise SaaS sales in supply-chain visibility; self-sourced territory; wrote and shared a post-mortem on a lost freight deal." },
  { key: "H5", label: "Hire 5 · Backend engineer (rated low)", profile: "Backend engineer, one of 12 on an order-management platform at a large e-commerce company; strong technical metrics; narrow scope inside a big team." },
  { key: "H6", label: "Hire 6 · Customer success (rated high)", profile: "Freight-forwarder customer desk then B2B SaaS customer success; churn 6% vs 24% team average; built the onboarding framework the whole team uses; no escalations." },
  { key: "H7", label: "Hire 7 · Product Manager (rated high)", profile: "3PL carrier operations and supply-chain analyst turned sole PM at a port/logistics SaaS; ships fast, killed features on usage data, owned outage post-mortem, 'doesn't hedge'." },
  { key: "H8", label: "Hire 8 · Marketing (rated medium)", profile: "B2B SaaS demand-generation lead with no CMO above; built a team from scratch; strong pipeline numbers; no logistics exposure." },
] as const;

export type HireKey = (typeof PAST_HIRES)[number]["key"];

export function hireLabel(key: string | null): string | null {
  return PAST_HIRES.find((h) => h.key === key)?.label ?? null;
}
