import { prisma } from "@/lib/db";

export const SITE_SETTINGS_ID = "default";

export const DEFAULT_SITE_SETTINGS = {
  heroTitle: "Kar1n Tease Paradise",
  heroSubtitle: "Kar1n 调教乐园 · 分支剧情文字冒险",
  heroBody: "注册账号后可游玩免费作品；付费作品需使用专属秘钥激活解锁。",
  navBrand: "Kar1n Tease Paradise",
} as const;

export type SiteSettingsPublic = {
  heroTitle: string;
  heroSubtitle: string;
  heroBody: string;
  navBrand: string;
};

export async function ensureSiteSettings() {
  const existing = await prisma.siteSettings.findUnique({
    where: { id: SITE_SETTINGS_ID },
  });
  if (existing) return existing;
  return prisma.siteSettings.create({
    data: {
      id: SITE_SETTINGS_ID,
      ...DEFAULT_SITE_SETTINGS,
    },
  });
}

export async function getSiteSettingsPublic(): Promise<SiteSettingsPublic> {
  const row = await ensureSiteSettings();
  return {
    heroTitle: row.heroTitle,
    heroSubtitle: row.heroSubtitle,
    heroBody: row.heroBody,
    navBrand: row.navBrand,
  };
}
