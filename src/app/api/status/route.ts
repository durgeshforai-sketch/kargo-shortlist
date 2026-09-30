import { NextResponse } from "next/server";
import { aiMode } from "@/lib/ai";
import { env } from "@/lib/env";

export async function GET() {
  let ai: string;
  try {
    ai = aiMode();
  } catch (e) {
    ai = (e as Error).message;
  }
  return NextResponse.json({
    ai,
    model: env.geminiModel,
    database: !!(env.supabaseUrl && env.supabaseKey),
    email: env.resendKey ? (env.testRecipient ? `test mode → ${env.testRecipient}` : "live") : "not configured",
  });
}
