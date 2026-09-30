import { NextResponse } from "next/server";
import { updateCandidate } from "@/lib/db";
import { fail } from "@/lib/http";
import { scoreCandidate } from "@/lib/pipeline";

export const maxDuration = 60;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await updateCandidate(id, { status: "processing" });
    const c = await scoreCandidate(id);
    // Force the brief/email to regenerate against the new scores (unless already sent).
    if (c.email_status !== "sent") await updateCandidate(id, { brief: null, email_body: null });
    return NextResponse.json({ status: c.status, error: c.error });
  } catch (e) {
    return fail(e);
  }
}
