import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isIdleExpired } from "@/lib/idle";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const secret = process.env.AUTH_SECRET;

  // Pas HTTPS cookie quhet "__Secure-authjs.session-token"; lokalisht pa prefiks.
  const token =
    (await getToken({ req: request, secret, secureCookie: true })) ??
    (await getToken({ req: request, secret, secureCookie: false }));

  if (!token || isIdleExpired(token.lastSeen)) {
    const url = new URL("/hyr", request.url);
    if (token) url.searchParams.set("arsye", "pasivitet");
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Layout-i e përdor që, pas zgjedhjes së rolit, përdoruesi të kthehet ku po shkonte.
  const headers = new Headers(request.headers);
  headers.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/panel/:path*"],
};
