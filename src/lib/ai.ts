import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { env } from "./env";
import { assertNoPersonalDetails, type Personal } from "./pii";
import { assessmentSchema, emailSchema } from "./prompts";
import { mockGenerate } from "./ai-mock";

export const Assessment = z.object({
  headline: z.string(),
  years_total: z.number(),
  years_product: z.number(),
  domains: z.array(z.string()),
  red_flags: z.array(z.string()),
  closest_hire: z.string(),
  closest_hire_reason: z.string(),
  scores: z.array(z.object({ code: z.string(), score: z.number().int().min(0).max(5), evidence: z.string(), reasoning: z.string() })),
});
export type Assessment = z.infer<typeof Assessment>;
export const EmailDraft = z.object({ subject: z.string(), body: z.string() });

let client: GoogleGenAI | null = null;

export function aiMode(): "gemini" | "mock" {
  if (env.geminiKey) return "gemini";
  if (env.isProd) throw new Error("GEMINI_API_KEY is required in production (mock AI is dev-only)");
  return "mock";
}

async function generate(kind: "assessment" | "brief" | "email", prompt: string, personal: Personal): Promise<string> {
  // The privacy guard runs before EVERY AI call.
  assertNoPersonalDetails(prompt, personal);
  if (aiMode() === "mock") return mockGenerate(kind, prompt);

  client ??= new GoogleGenAI({ apiKey: env.geminiKey! });
  const schema = kind === "assessment" ? assessmentSchema : kind === "email" ? emailSchema : undefined;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await client.models.generateContent({
        model: env.geminiModel,
        contents: prompt,
        config: {
          temperature: 0.2,
          ...(schema ? { responseMimeType: "application/json", responseJsonSchema: schema } : {}),
        },
      });
      const text = res.text?.trim();
      if (!text) throw new Error("Empty AI response");
      return text;
    } catch (e) {
      lastErr = e;
      const msg = String((e as Error)?.message ?? e);
      if (!/429|503|500|overloaded|RESOURCE_EXHAUSTED|UNAVAILABLE|Empty/i.test(msg)) break;
      await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export async function runAssessment(prompt: string, personal: Personal): Promise<Assessment> {
  return Assessment.parse(JSON.parse(await generate("assessment", prompt, personal)));
}

export async function runBrief(prompt: string, personal: Personal): Promise<string> {
  return (await generate("brief", prompt, personal)).replace(/\s+/g, " ").trim();
}

export async function runEmail(prompt: string, personal: Personal): Promise<z.infer<typeof EmailDraft>> {
  return EmailDraft.parse(JSON.parse(await generate("email", prompt, personal)));
}
