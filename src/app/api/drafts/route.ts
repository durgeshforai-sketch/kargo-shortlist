import { NextResponse } from "next/server";
import { syncDrafts } from "@/lib/drafts";
import { fail } from "@/lib/http";

export const maxDuration = 60;

/** Re-rank, then generate the briefs and invite/rejection drafts that are missing or out of date. */
export async function POST() {
  try {
    return NextResponse.json(await syncDrafts());
  } catch (e) {
    return fail(e);
  }
}
