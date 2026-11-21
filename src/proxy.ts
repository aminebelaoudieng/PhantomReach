import { NextRequest, NextResponse } from "next/server";

function unauthorized(message = "Authentication required"): NextResponse {
  return new NextResponse(message, {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Phantom Reach", charset="UTF-8"' },
  });
}

export function proxy(request: NextRequest): NextResponse {
  if (request.nextUrl.pathname === "/api/health") return NextResponse.next();

  const expectedUser = process.env.APP_ACCESS_USERNAME?.trim();
  const expectedPassword = process.env.APP_ACCESS_PASSWORD?.trim();

  if (!expectedUser || !expectedPassword) {
    return process.env.VERCEL === "1"
      ? new NextResponse("Hosted access protection is not configured.", { status: 503 })
      : NextResponse.next();
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) return unauthorized();

  try {
    const decoded = atob(authorization.slice(6));
    const separator = decoded.indexOf(":");
    const username = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);
    if (separator < 0 || username !== expectedUser || password !== expectedPassword) {
      return unauthorized("Invalid credentials");
    }
  } catch {
    return unauthorized("Invalid credentials");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

