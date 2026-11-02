import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      isAdmin: true,
      banned: true,
      createdAt: true,
      activations: {
        include: { game: { select: { title: true } } },
      },
      _count: {
        select: { activations: true },
      },
    },
  });
  // Never include passwordHash
  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      isAdmin: u.isAdmin,
      banned: u.banned,
      createdAt: u.createdAt,
      activationCount: u._count.activations,
      activations: u.activations,
    })),
  });
}
