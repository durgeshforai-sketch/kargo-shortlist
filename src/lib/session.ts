/**
 * Signed session cookie: "<expiry>.<hmac>". No server-side store; the HMAC key is derived
 * from SESSION_SECRET (or DASHBOARD_PASSWORD), so changing the password logs everyone out.
 * Uses Web Crypto so it runs in both the proxy and route handlers.
 */
export const SESSION_COOKIE = "kargo_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function secret(): string | null {
  return process.env.SESSION_SECRET || process.env.DASHBOARD_PASSWORD || null;
}

async function hmac(data: string, key: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data));
  return Buffer.from(sig).toString("base64url");
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export async function createSession(): Promise<string> {
  const key = secret();
  if (!key) throw new Error("DASHBOARD_PASSWORD is not configured");
  const expiry = String(Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS);
  return `${expiry}.${await hmac(expiry, key)}`;
}

export async function verifySession(token: string | undefined): Promise<boolean> {
  const key = secret();
  if (!key || !token) return false;
  const [expiry, sig] = token.split(".");
  if (!expiry || !sig || Number(expiry) < Date.now() / 1000) return false;
  return safeEqual(sig, await hmac(expiry, key));
}

export function loginEnabled(): boolean {
  return !!process.env.DASHBOARD_PASSWORD;
}

export function checkCredentials(username: string, password: string): boolean {
  const user = process.env.DASHBOARD_USER || "arjun";
  const pass = process.env.DASHBOARD_PASSWORD ?? "";
  // Evaluate both so timing doesn't reveal which one was wrong.
  const okUser = safeEqual(username.trim().toLowerCase(), user.toLowerCase());
  const okPass = safeEqual(password, pass);
  return !!pass && okUser && okPass;
}
