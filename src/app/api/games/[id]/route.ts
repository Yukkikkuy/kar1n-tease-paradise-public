import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/session";
import { canPlayGame } from "@/lib/auth";
import { normalizeNodes, type GameNode } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireUser();
  const game = await prisma.game.findUnique({ where: { id: params.id } });
  if (!game) {
    return NextResponse.json({ error: "作品不存在" }, { status: 404 });
  }

  const rawNodes = JSON.parse(game.nodesJson || "[]") as GameNode[];
  const nodes = normalizeNodes(rawNodes);

  // Admin editing: full access
  if (user?.isAdmin) {
    return NextResponse.json({
      game: {
        ...game,
        nodes,
      },
      canEdit: true,
      canPlay: true,
    });
  }

  if (!game.published) {
    return NextResponse.json({ error: "作品未发布" }, { status: 404 });
  }

  // Public meta without full nodes unless unlocked
  if (!user) {
    return NextResponse.json({
      game: {
        id: game.id,
        title: game.title,
        description: game.description,
        coverUrl: game.coverUrl,
        isFree: game.isFree,
        published: game.published,
      },
      canPlay: false,
      canEdit: false,
    });
  }

  const access = await canPlayGame(user.id, game.id);
  if (!access.ok) {
    return NextResponse.json({
      game: {
        id: game.id,
        title: game.title,
        description: game.description,
        coverUrl: game.coverUrl,
        isFree: game.isFree,
        published: game.published,
      },
      canPlay: false,
      canEdit: false,
      reason: access.reason,
    });
  }

  return NextResponse.json({
    game: {
      ...game,
      nodes,
    },
    canPlay: true,
    canEdit: false,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = String(body.title);
  if (body.description !== undefined) data.description = String(body.description);
  if (body.isFree !== undefined) data.isFree = !!body.isFree;
  if (body.published !== undefined) data.published = !!body.published;
  if (body.coverUrl !== undefined) data.coverUrl = body.coverUrl;
  if (body.startNodeId !== undefined) data.startNodeId = body.startNodeId;
  if (body.nodes !== undefined) {
    // Persist normalized steps so old content/media get migrated on save
    const nodes = normalizeNodes(body.nodes as GameNode[]);
    data.nodesJson = JSON.stringify(nodes);
  }

  const game = await prisma.game.update({
    where: { id: params.id },
    data,
  });
  return NextResponse.json({
    game: {
      ...game,
      nodes: normalizeNodes(JSON.parse(game.nodesJson || "[]")),
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }
  await prisma.game.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
