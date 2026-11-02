import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }
  const body = await req.json();
  if (typeof body.revoked === "boolean") {
    await prisma.licenseKey.update({
      where: { id: params.id },
      data: { revoked: body.revoked },
    });
  }
  return NextResponse.json({ ok: true });
}
