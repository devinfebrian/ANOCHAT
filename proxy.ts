import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/login(.*)", "/sign-up(.*)", "/api/health"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const path = req.nextUrl.pathname;

  if (!userId && !isPublicRoute(req)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (userId && (path === "/login" || path === "/")) {
    const url = req.nextUrl.clone();
    url.pathname = "/events";
    url.search = "";
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
