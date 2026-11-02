import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { generateLicenseCode } from "@/lib/keys";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }
  const keys = await prisma.licenseKey.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      game: { select: { id: true, title: true } },
      activations: {
        include: { user: { select: { id: true, username: true } } },
      },
    },
  });
  return NextResponse.json({ keys });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }
  const body = await req.json();
  const gameId = String(body.gameId || "");
  const mode = body.mode === "permanent" ? "permanent" : "onetime";
  const note = String(body.note || "");
  const count = Math.min(Math.max(Number(body.count) || 1, 1), 50);

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) {
    return NextResponse.json({ error: "作品不存在" }, { status: 400 });
  }

  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    let code = generateLicenseCode();
    // rare collision retry
    for (let r = 0; r < 5; r++) {
      const exists = await prisma.licenseKey.findUnique({ where: { code } });
      if (!exists) break;
      code = generateLicenseCode();
    }
    await prisma.licenseKey.create({
      data: {
        code,
        mode,
        gameId,
        note,
        createdById: admin.id,
      },
    });
    codes.push(code);
  }

  return NextResponse.json({ ok: true, codes });
}
