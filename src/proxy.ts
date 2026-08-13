import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth routes must NOT go through intl middleware — it would add a locale
  // prefix and break the OAuth callback (redirecting /auth/callback → /en/auth/callback).
  if (pathname.startsWith("/auth")) {
    const { NextResponse } = await import("next/server");
    return updateSession(request, NextResponse.next({ request }));
  }

  const intlResponse = await Promise.resolve(intlMiddleware(request));
  // Run Supabase session refresh, copying any cookies the intl response set.
  return updateSession(request, intlResponse);
}

export const config = {
  // Skip Next internals, API routes (handled per-route), and static assets.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
