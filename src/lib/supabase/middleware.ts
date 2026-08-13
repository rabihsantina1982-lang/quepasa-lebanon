import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase auth cookies on each request. Receives the response
// produced by next-intl so we don't clobber its locale rewrite/redirect.
export async function updateSession(
  request: NextRequest,
  incomingResponse: NextResponse
) {
  const response =
    incomingResponse ?? NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // Touch the session so the cookies refresh.
  await supabase.auth.getUser();

  return response;
}
