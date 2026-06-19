import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/env";

const protectedRoutes = ["/dashboard", "/projects"];
const authRoutes = ["/login", "/signup"];

function isProtectedRoute(pathname: string) {
  return protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isAuthRoute(pathname: string) {
  return authRoutes.includes(pathname);
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  if (!supabaseUrl || !supabaseKey) {
    if (isProtectedRoute(request.nextUrl.pathname)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("error", "Supabase environment variables are not configured.");
      return NextResponse.redirect(redirectUrl);
    }

    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedRoute(request.nextUrl.pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthRoute(request.nextUrl.pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
