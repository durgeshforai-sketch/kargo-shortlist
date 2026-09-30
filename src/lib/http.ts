import { NextResponse } from "next/server";

export function fail(e: unknown, status = 500) {
  const message = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ error: message }, { status });
}
