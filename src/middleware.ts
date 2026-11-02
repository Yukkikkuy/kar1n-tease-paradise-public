import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session-options";
import { getSiteRole, isAdminPath, servesAdmin } from "@/lib/site-role";

function playerBlockedResponse(request: NextRequest, isApi: boolean) {
  if (isApi) {
    return NextResponse.json(
      {
        error:
          "此为玩家站，不提供管理接口。请使用本机管理端或公网站点的 /admin（管理员登录）。",
      },
      { status: 404 }
    );
  }
  const url = request.nextUrl.clone();
  url.pathname = "/wrong-site";
  url.search = "";
  return NextResponse.rewrite(url);
}

async function requireAdminSession(
  request: NextRequest,
  pathname: string,
  host: string | null
) {
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(
    request,
    response,
    sessionOptions
  );
  const user = session.user;
  const isAdminPage =
    pathname === "/admin" || pathname.startsWith("/admin/");
  const isEditor = pathname === "/editor" || pathname.startsWith("/editor/");
  const isAdminApi = pathname.startsWith("/api/admin");

  if (!user?.isAdmin) {
    if (isAdminApi) {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
    }
    const proto = request.headers.get("x-forwarded-proto") || "http";
    const hostHeader = host || "127.0.0.1:3001";
    if (isEditor) {
      const dest = new URL("/admin/login", `${proto}://${hostHeader}`);
      dest.searchParams.set("from", pathname);
      return NextResponse.redirect(dest);
    }
    if (isAdminPage) {
      return NextResponse.redirect(`${proto}://${hostHeader}/admin/login`);
    }
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host");
  const role = getSiteRole(host);

  // Dedicated player process: block all admin surfaces
  if (role === "player") {
    if (isAdminPath(pathname)) {
      return playerBlockedResponse(request, pathname.startsWith("/api/"));
    }
    return NextResponse.next();
  }

  // Dedicated admin process: / → /admin
  if (role === "admin" && pathname === "/") {
    const proto = request.headers.get("x-forwarded-proto") || "http";
    const hostHeader = host || "127.0.0.1:3001";
    return NextResponse.redirect(`${proto}://${hostHeader}/admin`);
  }

  // admin | all: protect admin/editor/api/admin (login page open)
  if (servesAdmin(role)) {
    if (pathname === "/admin/login") {
      return NextResponse.next();
    }
    const isAdminPage =
      pathname === "/admin" || pathname.startsWith("/admin/");
    const isEditor = pathname === "/editor" || pathname.startsWith("/editor/");
    const isAdminApi = pathname.startsWith("/api/admin");
    if (isAdminPage || isEditor || isAdminApi) {
      return requireAdminSession(request, pathname, host);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/wrong-site",
    "/admin",
    "/admin/:path*",
    "/editor",
    "/editor/:path*",
    "/api/admin/:path*",
  ],
};
