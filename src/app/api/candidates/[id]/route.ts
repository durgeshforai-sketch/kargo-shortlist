import { NextResponse } from "next/server";
import { getCandidate, logActivity, updateCandidate } from "@/lib/db";
import { fail } from "@/lib/http";
import type { Candidate } from "@/lib/types";

/** Founder edits: the draft email text, or overriding the proposed tier. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const c = await getCandidate(id);
    if (!c) return fail("Not found", 404);
    const body = (await req.json()) as { email_subject?: string; email_body?: string; tier?: "interview" | "decline" | "system" };
    const patch: Partial<Candidate> = {};

    if (body.email_subject !== undefined || body.email_body !== undefined) {
      if (c.email_status === "sent") return fail("This email was already sent", 409);
      if (body.email_subject !== undefined) patch.email_subject = body.email_subject.slice(0, 200);
      if (body.email_body !== undefined) patch.email_body = body.email_body.slice(0, 5000);
    }
    if (body.tier) {
      if (c.email_status === "sent") return fail("Email already sent; tier is locked", 409);
      if (body.tier === "system") {
        patch.tier_source = "system";
      } else {
        patch.tier = body.tier;
        patch.tier_source = "founder";
      }
    }
    const updated = await updateCandidate(id, patch);
    await logActivity(id, body.tier ? "tier_override" : "draft_edited", body.tier ?? undefined);
    return NextResponse.json({ ok: true, tier: updated.tier });
  } catch (e) {
    return fail(e);
  }
}
