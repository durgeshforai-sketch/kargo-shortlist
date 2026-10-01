import { NextResponse } from "next/server";
import { checkCredentials, createSession, SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/session";

export async function POST(req: Request) {
  const { username, password } = (await req.json().catch(() => ({}))) as { username?: string; password?: string };
  if (!checkCredentials(username ?? "", password ?? "")) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return NextResponse.json({ error: "Incorrect username or password." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
