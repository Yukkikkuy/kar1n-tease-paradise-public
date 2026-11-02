import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";
import { resolveUploadPath } from "@/lib/uploads";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const gameId = String(form.get("gameId") || "common").replace(
    /[^a-zA-Z0-9_-]/g,
    ""
  );
  if (!file) {
    return NextResponse.json({ error: "未选择文件" }, { status: 400 });
  }

  const nameOk = /\.(jpe?g|png|gif|webp|mp3|wav|ogg|webm|mp4|m4a)$/i.test(
    file.name
  );
  if (!nameOk) {
    return NextResponse.json(
      { error: "仅支持图片 / 音频 / 视频常见格式" },
      { status: 400 }
    );
  }

  const ext = path.extname(file.name) || ".bin";
  const dir = resolveUploadPath("games", gameId || "common");
  if (!dir) {
    return NextResponse.json({ error: "无效路径" }, { status: 400 });
  }
  await mkdir(dir, { recursive: true });
  const filename = `${nanoid(12)}${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buf);

  const url = `/uploads/games/${gameId || "common"}/${filename}`;
  return NextResponse.json({ ok: true, url, type: file.type, name: file.name });
}
