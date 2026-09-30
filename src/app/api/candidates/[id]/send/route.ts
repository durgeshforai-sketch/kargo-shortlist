import { NextResponse } from "next/server";
import { sendCandidateEmail } from "@/lib/email";
import { fail } from "@/lib/http";

/** The only path to Resend: the founder's explicit Confirm & send. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { confirm } = (await req.json().catch(() => ({}))) as { confirm?: boolean };
    if (confirm !== true) return fail("Sending needs explicit confirmation", 400);
    const c = await sendCandidateEmail(id);
    if (c.email_status !== "sent") return fail(c.email_error ?? "Send failed", 502);
    return NextResponse.json({ ok: true, sent_to: c.sent_to, sent_at: c.sent_at });
  } catch (e) {
    return fail(e);
  }
}
