import { NextResponse, type NextRequest } from "next/server";
import { loginEnabled, SESSION_COOKIE, verifySession } from "@/lib/session";

const PUBLIC = ["/login", "/api/login"];

/** Every page and API route needs a signed-in session, except the login page itself. */
export async function proxy(req: NextRequest) {
  if (!loginEnabled()) {
    if (process.env.VERCEL_ENV === "production") return new NextResponse("DASHBOARD_PASSWORD is not configured", { status: 503 });
    return NextResponse.next(); // local dev without a password
  }
  const { pathname, search } = req.nextUrl;
  if (PUBLIC.includes(pathname)) return NextResponse.next();
  if (await verifySession(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const url = new URL("/login", req.url);
  if (pathname !== "/") url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
