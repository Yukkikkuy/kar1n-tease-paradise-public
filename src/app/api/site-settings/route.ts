import { NextResponse } from "next/server";
import { getSiteSettingsPublic } from "@/lib/site-settings";

export async function GET() {
  try {
    const settings = await getSiteSettingsPublic();
    return NextResponse.json({ settings });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "读取站点设置失败" }, { status: 500 });
  }
}
