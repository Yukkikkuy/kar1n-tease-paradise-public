import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const body = await req.json();
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");
  const confirmPassword = String(body.confirmPassword || "");

  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: "新密码至少 6 位" },
      { status: 400 }
    );
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { error: "两次输入的新密码不一致" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: admin.id } });
  if (!user) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "当前密码不正确" }, { status: 400 });
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: admin.id },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true, message: "密码已更新" });
}
