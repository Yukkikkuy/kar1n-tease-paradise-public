import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const fresh = await prisma.user.findUnique({ where: { id: user.id } });
  if (!fresh || fresh.banned) {
    return NextResponse.json({ error: "账号已被封禁" }, { status: 403 });
  }

  const body = await req.json();
  const code = String(body.code || "")
    .trim()
    .toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "请输入秘钥" }, { status: 400 });
  }

  const key = await prisma.licenseKey.findUnique({
    where: { code },
    include: { game: true },
  });
  if (!key || key.revoked) {
    return NextResponse.json({ error: "秘钥无效或已作废" }, { status: 400 });
  }

  // Already activated this game?
  const existing = await prisma.activation.findUnique({
    where: { userId_gameId: { userId: user.id, gameId: key.gameId } },
  });
  if (existing) {
    return NextResponse.json({
      ok: true,
      message: "你已激活过该作品",
      game: { id: key.game.id, title: key.game.title },
    });
  }

  if (key.mode === "onetime") {
    if (key.used) {
      return NextResponse.json(
        { error: "该一次性秘钥已被使用，无法再次激活" },
        { status: 400 }
      );
    }
  } else if (key.mode === "permanent") {
    // Permanent key binds to first account only
    if (key.used) {
      const bound = await prisma.activation.findFirst({
        where: { keyId: key.id },
      });
      if (bound && bound.userId !== user.id) {
        return NextResponse.json(
          { error: "该永久秘钥已绑定其他账号，无法盗用" },
          { status: 400 }
        );
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.licenseKey.update({
      where: { id: key.id },
      data: { used: true },
    });
    await tx.activation.create({
      data: {
        userId: user.id,
        gameId: key.gameId,
        keyId: key.id,
      },
    });
  });

  return NextResponse.json({
    ok: true,
    message: "激活成功",
    game: { id: key.game.id, title: key.game.title },
    mode: key.mode,
  });
}
