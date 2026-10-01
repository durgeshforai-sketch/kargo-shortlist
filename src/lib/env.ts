import "server-only";

function read(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

export const env = {
  supabaseUrl: read("SUPABASE_URL"),
  supabaseKey: read("SUPABASE_SERVICE_ROLE_KEY"),
  geminiKey: read("GEMINI_API_KEY"),
  geminiModel: read("GEMINI_MODEL") ?? "gemini-flash-latest",
  resendKey: read("RESEND_API_KEY"),
  emailFrom: read("EMAIL_FROM") ?? "Kargo Hiring <onboarding@resend.dev>",
  emailReplyTo: read("EMAIL_REPLY_TO"),
  // When set, every email goes here instead of the candidate's address.
  testRecipient: read("EMAIL_TEST_RECIPIENT"),
  isProd: process.env.VERCEL_ENV === "production",
};

export function requireEnv<K extends keyof typeof env>(key: K, label: string): NonNullable<(typeof env)[K]> {
  const v = env[key];
  if (v === undefined || v === null) throw new Error(`${label} is not configured`);
  return v as NonNullable<(typeof env)[K]>;
}
