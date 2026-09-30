import { NextResponse } from "next/server";
import { listCandidates } from "@/lib/db";
import { fail } from "@/lib/http";
import { ingestCv } from "@/lib/pipeline";
import type { Role } from "@/lib/types";

export const maxDuration = 60;

/** Founder uploads one CV + selects the applied role (component map: Trigger → Input). */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const role = form.get("role");
    if (!(file instanceof File)) return fail("Attach a CV file", 400);
    if (role !== "PM" && role !== "SPM") return fail("Select the applied role: PM or SPM", 400);
    if (file.size > 8 * 1024 * 1024) return fail("File is larger than 8 MB", 400);
    const c = await ingestCv(file.name, new Uint8Array(await file.arrayBuffer()), role as Role);
    return NextResponse.json({ id: c.id, status: c.status, error: c.error, pm_score: c.pm_score, spm_score: c.spm_score, duplicate_of: c.duplicate_of });
  } catch (e) {
    return fail(e);
  }
}

export async function GET() {
  try {
    const rows = await listCandidates();
    // Never ship CV text or contact details to the browser in bulk.
    return NextResponse.json(rows.map(({ cv_content: _c, email: _e, phone: _p, links: _l, ...rest }) => rest));
  } catch (e) {
    return fail(e);
  }
}
