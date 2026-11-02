import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import {
  DEFAULT_SITE_SETTINGS,
  SITE_SETTINGS_ID,
  ensureSiteSettings,
  getSiteSettingsPublic,
} from "@/lib/site-settings";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }
  try {
    const settings = await getSiteSettingsPublic();
    return NextResponse.json({ settings });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "读取失败" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的请求体" }, { status: 400 });
  }

  const heroTitle = String(body.heroTitle ?? "").trim();
  const heroSubtitle = String(body.heroSubtitle ?? "").trim();
  const heroBody = String(body.heroBody ?? "").trim();
  let navBrand = String(body.navBrand ?? "").trim();

  if (!heroTitle) {
    return NextResponse.json({ error: "大标题不能为空" }, { status: 400 });
  }
  if (!heroSubtitle) {
    return NextResponse.json({ error: "副标题不能为空" }, { status: 400 });
  }
  if (!heroBody) {
    return NextResponse.json({ error: "说明段不能为空" }, { status: 400 });
  }
  if (!navBrand) {
    navBrand = heroTitle;
  }

  try {
    await ensureSiteSettings();
    const updated = await prisma.siteSettings.update({
      where: { id: SITE_SETTINGS_ID },
      data: { heroTitle, heroSubtitle, heroBody, navBrand },
    });
    return NextResponse.json({
      ok: true,
      settings: {
        heroTitle: updated.heroTitle,
        heroSubtitle: updated.heroSubtitle,
        heroBody: updated.heroBody,
        navBrand: updated.navBrand,
      },
      defaults: DEFAULT_SITE_SETTINGS,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}
