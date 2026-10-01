/** Logs in to a running app and returns headers carrying the session cookie (empty if login is off). */
export async function authHeaders(base: string): Promise<Record<string, string>> {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) return {};
  const res = await fetch(`${base}/api/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: process.env.DASHBOARD_USER ?? "arjun", password }),
  });
  if (!res.ok) throw new Error(`Login failed (${res.status})`);
  const cookie = res.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error("Login returned no session cookie");
  return { cookie };
}
