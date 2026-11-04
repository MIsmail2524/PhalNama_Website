import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, REFERRAL_COOKIE, verifyToken, type AdminToken } from "@/lib/session";

/**
 * - Guards /admin (cheap JWT check here; every admin page and action
 *   re-checks the database and role on the server).
 * - Captures ?ref=CODE referral links into a cookie.
 */
export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const ok = await verifyToken<AdminToken>(req.cookies.get(ADMIN_COOKIE)?.value, "admin");
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // Short share links: /r/CODE -> referral welcome page
  const short = pathname.match(/^\/r\/([A-Za-z0-9]{4,20})\/?$/);
  if (short) {
    const url = req.nextUrl.clone();
    url.pathname = `/refer/${short[1].toUpperCase()}`;
    const res = NextResponse.redirect(url);
    res.cookies.set(REFERRAL_COOKIE, short[1].toUpperCase(), { maxAge: 60 * 60 * 24 * 30, sameSite: "lax", path: "/", httpOnly: true });
    return res;
  }

  const ref = searchParams.get("ref");
  if (ref && /^[A-Z0-9]{4,20}$/i.test(ref)) {
    const res = NextResponse.next();
    res.cookies.set(REFERRAL_COOKIE, ref.toUpperCase(), { maxAge: 60 * 60 * 24 * 30, sameSite: "lax", path: "/", httpOnly: true });
    return res;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|images|brand|uploads|fonts|api).*)"],
};
