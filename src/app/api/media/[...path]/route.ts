import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";
import { resolveUploadPath } from "@/lib/uploads";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const full = resolveUploadPath(...(params.path || []));
  if (!full) {
    return NextResponse.json({ error: "无效路径" }, { status: 400 });
  }
  try {
    const st = await stat(full);
    if (!st.isFile()) {
      return NextResponse.json({ error: "未找到" }, { status: 404 });
    }
    const buf = await readFile(full);
    const ext = path.extname(full).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": type,
        "Content-Length": String(st.size),
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "未找到" }, { status: 404 });
  }
}
