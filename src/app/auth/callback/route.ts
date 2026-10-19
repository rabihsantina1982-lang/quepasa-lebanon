import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { alertAdmins } from "@/lib/alerts";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/en";

  // Facebook / Google / Supabase sent back an error instead of a code.
  const providerError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (!code || providerError) {
    return failed(request, url, next, providerError ?? "No sign-in code came back");
  }

  // Build the redirect response first, then attach session cookies to it.
  // This is required — cookies set on a separate object won't carry through
  // when Next.js issues the redirect.
  const response = NextResponse.redirect(new URL(next, url.origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return failed(request, url, next, error.message);
  return response;
}

// Sign-in didn't finish: tell the admins why (throttled, see src/lib/alerts.ts)
// and send the visitor back with the sign-in box open and a "try again" note.
async function failed(request: NextRequest, url: URL, next: string, reason: string) {
  // The note the browser keeps while the visitor is on Facebook/Google's page
  // (the PKCE "code verifier" cookie). Safari sometimes drops it.
  const hasVerifier = request.cookies.getAll().some((c) => c.name.includes("code-verifier"));
  await alertAdmins(
    `auth:${reason.slice(0, 80)}`,
    "A sign-in didn't finish",
    [
      `Reason: ${reason}`,
      `Sign-in note (code verifier) in the browser: ${hasVerifier ? "yes" : "missing"}`,
      `Browser: ${request.headers.get("user-agent") ?? "unknown"}`,
      `Going back to: ${next}`,
    ].join("\n")
  );
  const back = new URL(next.startsWith("/") ? next : "/en", url.origin);
  back.searchParams.set("signin", "1");
  back.searchParams.set("signin_error", "1");
  return NextResponse.redirect(back);
}
