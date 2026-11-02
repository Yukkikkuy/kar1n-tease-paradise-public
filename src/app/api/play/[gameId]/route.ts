import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { canPlayGame } from "@/lib/auth";
import { normalizeNodes, type GameNode } from "@/lib/types";

function loadNodes(nodesJson: string): GameNode[] {
  return normalizeNodes(JSON.parse(nodesJson || "[]") as GameNode[]);
}

async function jumpToNode(opts: {
  userId: string;
  gameId: string;
  fromNodeId: string | null;
  next: GameNode;
  history: string[];
}) {
  const { userId, gameId, fromNodeId, next, history } = opts;
  if (fromNodeId) history.push(fromNodeId);
  await prisma.progress.upsert({
    where: { userId_gameId: { userId, gameId } },
    create: {
      userId,
      gameId,
      currentNode: next.id,
      historyJson: JSON.stringify(history),
    },
    update: {
      currentNode: next.id,
      historyJson: JSON.stringify(history),
    },
  });
  return history;
}

/** Get play state / start or continue */
export async function GET(
  _req: NextRequest,
  { params }: { params: { gameId: string } }
) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const access = await canPlayGame(user.id, params.gameId);
  if (!access.ok) {
    const msg =
      access.reason === "banned"
        ? "账号已被封禁"
        : access.reason === "locked"
          ? "尚未激活该作品，请先输入秘钥"
          : "作品不可用";
    return NextResponse.json({ error: msg, reason: access.reason }, { status: 403 });
  }

  const game = access.game;
  const nodes = loadNodes(game.nodesJson);
  const progress = await prisma.progress.findUnique({
    where: {
      userId_gameId: { userId: user.id, gameId: game.id },
    },
  });

  const currentNodeId =
    progress?.currentNode || game.startNodeId || nodes[0]?.id || null;
  const current = nodes.find((n) => n.id === currentNodeId) || null;

  return NextResponse.json({
    game: {
      id: game.id,
      title: game.title,
      startNodeId: game.startNodeId,
    },
    currentNode: current,
    history: progress ? JSON.parse(progress.historyJson || "[]") : [],
  });
}

/** Choose a choice / restart / step goto */
export async function POST(
  req: NextRequest,
  { params }: { params: { gameId: string } }
) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const access = await canPlayGame(user.id, params.gameId);
  if (!access.ok) {
    return NextResponse.json(
      { error: "无权游玩", reason: access.reason },
      { status: 403 }
    );
  }

  const game = access.game;
  const nodes = loadNodes(game.nodesJson);
  const body = await req.json();

  if (body.action === "restart") {
    const startId = game.startNodeId || nodes[0]?.id;
    await prisma.progress.upsert({
      where: { userId_gameId: { userId: user.id, gameId: game.id } },
      create: {
        userId: user.id,
        gameId: game.id,
        currentNode: startId || "",
        historyJson: "[]",
      },
      update: { currentNode: startId || "", historyJson: "[]" },
    });
    const current = nodes.find((n) => n.id === startId) || null;
    return NextResponse.json({ currentNode: current, history: [] });
  }

  const progress = await prisma.progress.findUnique({
    where: { userId_gameId: { userId: user.id, gameId: game.id } },
  });
  const currentId =
    progress?.currentNode || game.startNodeId || nodes[0]?.id;
  const current = nodes.find((n) => n.id === currentId);
  const history = progress
    ? (JSON.parse(progress.historyJson || "[]") as string[])
    : [];

  // Script-step goto / timer goto: jump by targetNodeId
  if (body.action === "goto") {
    const targetNodeId = String(body.targetNodeId || "").trim();
    if (!targetNodeId) {
      return NextResponse.json({ error: "未指定跳转目标" }, { status: 400 });
    }
    const next = nodes.find((n) => n.id === targetNodeId);
    if (!next) {
      return NextResponse.json({ error: "目标节点不存在" }, { status: 400 });
    }
    const updated = await jumpToNode({
      userId: user.id,
      gameId: game.id,
      fromNodeId: current?.id || null,
      next,
      history,
    });
    return NextResponse.json({ currentNode: next, history: updated });
  }

  const choiceId = String(body.choiceId || "");
  if (!current) {
    return NextResponse.json({ error: "当前节点无效" }, { status: 400 });
  }

  const choice = current.choices.find((c) => c.id === choiceId);
  if (!choice) {
    return NextResponse.json({ error: "无效选项" }, { status: 400 });
  }

  // continue = stay on node (client usually handles; keep API tolerant)
  if (choice.action === "continue") {
    return NextResponse.json({
      currentNode: current,
      history,
      continued: true,
    });
  }

  const next = nodes.find((n) => n.id === choice.targetNodeId);
  if (!next) {
    return NextResponse.json({ error: "目标节点不存在" }, { status: 400 });
  }

  const updated = await jumpToNode({
    userId: user.id,
    gameId: game.id,
    fromNodeId: current.id,
    next,
    history,
  });

  return NextResponse.json({ currentNode: next, history: updated });
}
