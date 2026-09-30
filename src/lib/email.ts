import "server-only";
import { Resend } from "resend";
import { env } from "./env";
import { getCandidate, logActivity, updateCandidate } from "./db";
import type { Candidate } from "./types";

export function firstName(c: Pick<Candidate, "full_name">): string {
  return c.full_name?.trim().split(/\s+/)[0] ?? "there";
}

/** Fills the placeholders the AI wrote. The real name only enters the text here, after the AI step. */
export function personalise(text: string, c: Pick<Candidate, "full_name">): string {
  return text.replace(/\{\{\s*first_name\s*\}\}|\[NAME\]/gi, firstName(c));
}

export function recipientFor(c: Pick<Candidate, "email">): string | null {
  return env.testRecipient ?? c.email;
}

/** Component map, Email Service row: only ever called from the founder's Confirm & send click. */
export async function sendCandidateEmail(id: string): Promise<Candidate> {
  const c = await getCandidate(id);
  if (!c) throw new Error("Candidate not found");
  if (c.email_status === "sent") throw new Error("Already sent");
  if (!c.email_subject || !c.email_body) throw new Error("No draft to send");
  if (!env.resendKey) throw new Error("RESEND_API_KEY is not configured");
  const to = recipientFor(c);
  if (!to) throw new Error("No recipient address for this candidate");

  const resend = new Resend(env.resendKey);
  const { data, error } = await resend.emails.send({
    from: env.emailFrom,
    to,
    subject: personalise(c.email_subject, c),
    text: personalise(c.email_body, c),
    ...(env.emailReplyTo ? { replyTo: env.emailReplyTo } : {}),
  });
  if (error) {
    await logActivity(id, "send_failed", error.message);
    return updateCandidate(id, { email_status: "failed", email_error: error.message });
  }
  await logActivity(id, "sent", `${c.email_kind} → ${to}`);
  return updateCandidate(id, { email_status: "sent", email_error: null, sent_to: to, sent_at: new Date().toISOString(), resend_id: data?.id ?? null });
}
