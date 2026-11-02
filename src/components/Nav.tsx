"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSiteConfig } from "@/components/SiteConfig";
import { servesAdmin } from "@/lib/site-role";

type User = { id: string; username: string; isAdmin: boolean } | null;

export default function Nav() {
  const { siteRole, playerSiteUrl } = useSiteConfig();
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [navBrand, setNavBrand] = useState("Kar1n Tease Paradise");
  const router = useRouter();
  const pathname = usePathname() || "";
  const onAdminPath =
    pathname === "/admin" ||
    (pathname.startsWith("/admin/") && pathname !== "/admin/login") ||
    pathname.startsWith("/editor/");
  const isAdminArea = servesAdmin(siteRole) && onAdminPath;

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .finally(() => setLoading(false));
  }, [pathname]);

  useEffect(() => {
    if (siteRole === "admin") return;
    fetch("/api/site-settings")
      .then((r) => r.json())
      .then((d) => {
        const brand = d.settings?.navBrand || d.settings?.heroTitle;
        if (brand) setNavBrand(brand);
      })
      .catch(() => {});
  }, [siteRole]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push(isAdminArea || siteRole === "admin" ? "/admin/login" : "/");
    router.refresh();
  }

  if (servesAdmin(siteRole) && pathname === "/admin/login") {
    return (
      <header className="border-b border-amber-900/30 bg-stone-950/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="font-bold text-amber-200 tracking-wide">
            管理后台
          </span>
          <Link
            href={siteRole === "all" ? "/" : playerSiteUrl}
            className="text-sm text-stone-400 hover:text-amber-200"
          >
            打开玩家站
          </Link>
        </div>
      </header>
    );
  }

  if (isAdminArea) {
    return (
      <header className="border-b border-amber-900/40 bg-stone-950 sticky top-0 z-50">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <Link href="/admin" className="font-bold text-amber-200 tracking-wide">
            管理后台
          </Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm text-stone-300">
            <Link href="/admin/games" className="hover:text-amber-200">
              作品
            </Link>
            <Link href="/admin/keys" className="hover:text-amber-200">
              秘钥
            </Link>
            <Link href="/admin/users" className="hover:text-amber-200">
              用户
            </Link>
            <Link href="/admin/activations" className="hover:text-amber-200">
              激活记录
            </Link>
            <Link href="/admin/site" className="hover:text-amber-200">
              首页文案
            </Link>
            <Link href="/admin/password" className="hover:text-amber-200">
              改密
            </Link>
            {siteRole === "all" ? (
              <Link href="/" className="text-stone-500 hover:text-amber-200">
                玩家站
              </Link>
            ) : (
              <a
                href={playerSiteUrl}
                className="text-stone-500 hover:text-amber-200"
                target="_blank"
                rel="noreferrer"
              >
                玩家站
              </a>
            )}
            {!loading && user && (
              <>
                <span className="text-stone-500">{user.username}</span>
                <button
                  onClick={logout}
                  className="rounded border border-stone-600 px-2 py-0.5 hover:border-amber-600"
                >
                  退出
                </button>
              </>
            )}
          </nav>
        </div>
      </header>
    );
  }

  // Player / public home nav
  return (
    <header className="border-b border-amber-900/30 bg-stone-950/80 backdrop-blur sticky top-0 z-50">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-bold text-amber-200 tracking-wide">
          {navBrand}
        </Link>
        <nav className="flex items-center gap-3 text-sm text-stone-300">
          <Link href="/" className="hover:text-amber-200">
            作品
          </Link>
          <Link href="/activate" className="hover:text-amber-200">
            激活秘钥
          </Link>
          {!loading && !user && (
            <>
              <Link href="/login" className="hover:text-amber-200">
                登录
              </Link>
              <Link
                href="/register"
                className="rounded bg-amber-700 px-3 py-1 text-amber-50 hover:bg-amber-600"
              >
                注册
              </Link>
            </>
          )}
          {!loading && user && (
            <>
              <span className="text-stone-400">你好，{user.username}</span>
              {siteRole === "all" && user.isAdmin && (
                <Link href="/admin" className="text-amber-300/80 hover:text-amber-200">
                  管理
                </Link>
              )}
              <button
                onClick={logout}
                className="rounded border border-stone-600 px-2 py-0.5 hover:border-amber-600"
              >
                退出
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
