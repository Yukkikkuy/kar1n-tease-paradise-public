import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import SiteShell from "@/components/SiteShell";
import {
  SITE_BRAND,
  getAdminSiteUrl,
  getPlayerSiteUrl,
  getSiteRole,
} from "@/lib/site-role";

export function generateMetadata(): Metadata {
  const host = headers().get("host");
  const siteRole = getSiteRole(host);
  return {
    title:
      siteRole === "admin"
        ? `${SITE_BRAND} · 管理端`
        : SITE_BRAND,
    description:
      siteRole === "admin"
        ? "管理后台 · 秘钥 · 用户 · 编辑器"
        : "Kar1n Tease Paradise · 分支剧情文字冒险 · 秘钥解锁",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const host = headers().get("host");
  const siteConfig = {
    siteRole: getSiteRole(host),
    playerSiteUrl: getPlayerSiteUrl(),
    adminSiteUrl: getAdminSiteUrl(),
  };

  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-stone-900 text-stone-100 antialiased">
        <SiteShell siteConfig={siteConfig}>{children}</SiteShell>
      </body>
    </html>
  );
}
