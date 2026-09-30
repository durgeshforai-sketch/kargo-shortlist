export type Role = "PM" | "SPM";
export const ROLES: Role[] = ["PM", "SPM"];
export const ROLE_LABEL: Record<Role, string> = { PM: "Product Manager", SPM: "Senior Product Manager" };

/** How many candidates per role get an interview invite drafted by default. */
export const INTERVIEW_SLOTS = 5;

export interface Criterion {
  code: string;
  role: Role;
  name: string;
  weight: number;
  description: string;
  position: number;
}

export interface CriterionScore {
  code: string;
  score: number;
  evidence: string | null;
  evidence_verified: boolean;
  reasoning: string;
}

export interface Candidate {
  id: string;
  created_at: string;
  applied_role: Role;
  file_name: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  links: string[];
  cv_content: string;
  content_hash: string;
  status: "processing" | "scored" | "error";
  error: string | null;
  headline: string | null;
  years_total: number | null;
  years_product: number | null;
  domains: string[];
  closest_hire: string | null;
  closest_hire_reason: string | null;
  red_flags: string[];
  pm_score: number | null;
  spm_score: number | null;
  duplicate_of: string | null;
  tier: "interview" | "decline" | null;
  tier_source: "system" | "founder";
  brief: string | null;
  email_kind: "invite" | "rejection" | null;
  email_subject: string | null;
  email_body: string | null;
  email_status: "none" | "draft" | "sent" | "failed";
  email_error: string | null;
  sent_to: string | null;
  sent_at: string | null;
  resend_id: string | null;
}

export function roleScore(c: Pick<Candidate, "pm_score" | "spm_score">, role: Role): number | null {
  return role === "PM" ? c.pm_score : c.spm_score;
}
