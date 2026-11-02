import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }
  const activations = await prisma.activation.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, username: true, banned: true } },
      game: { select: { id: true, title: true } },
      key: { select: { id: true, code: true, mode: true } },
    },
  });
  return NextResponse.json({ activations });
}
