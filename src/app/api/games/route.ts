import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, requireAdmin } from "@/lib/session";

export async function GET() {
  const user = await requireUser();
  const games = await prisma.game.findMany({
    where: user?.isAdmin ? undefined : { published: true },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      coverUrl: true,
      isFree: true,
      published: true,
      updatedAt: true,
    },
  });

  let unlocked = new Set<string>();
  if (user) {
    const acts = await prisma.activation.findMany({
      where: { userId: user.id },
      select: { gameId: true },
    });
    unlocked = new Set(acts.map((a) => a.gameId));
  }

  const list = games.map((g) => ({
    ...g,
    unlocked: g.isFree || !!user?.isAdmin || unlocked.has(g.id),
  }));

  return NextResponse.json({ games: list, user });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }
  const body = await req.json();
  const title = String(body.title || "未命名作品").trim() || "未命名作品";
  const game = await prisma.game.create({
    data: {
      title,
      description: String(body.description || ""),
      isFree: !!body.isFree,
      published: false,
      startNodeId: null,
      nodesJson: "[]",
    },
  });
  return NextResponse.json({ game });
}
