import { NextResponse, type NextRequest } from "next/server";

/** Whole-app HTTP basic auth. Production refuses to serve without a password configured. */
export function proxy(req: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) {
    if (process.env.VERCEL_ENV === "production") return new NextResponse("DASHBOARD_PASSWORD is not configured", { status: 503 });
    return NextResponse.next();
  }
  const header = req.headers.get("authorization") ?? "";
  const [scheme, encoded] = header.split(" ");
  if (scheme === "Basic" && encoded) {
    const [, pass] = atob(encoded).split(":");
    if (pass === password) return NextResponse.next();
  }
  return new NextResponse("Authentication required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Kargo Shortlist"' } });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
