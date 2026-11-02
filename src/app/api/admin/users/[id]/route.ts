import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { hashPassword } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  const body = await req.json();
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  // Reset password for non-admin users
  if (typeof body.newPassword === "string") {
    if (target.isAdmin) {
      return NextResponse.json(
        { error: "不能在此重置管理员密码，请使用「修改密码」页" },
        { status: 400 }
      );
    }
    const newPassword = body.newPassword;
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "新密码至少 6 位" },
        { status: 400 }
      );
    }
    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: params.id },
      data: { passwordHash },
    });
    // Return the temp password once — never store plaintext
    return NextResponse.json({
      ok: true,
      temporaryPassword: newPassword,
      message: "密码已重置，请立即告知该用户（仅显示一次）",
    });
  }

  if (typeof body.banned === "boolean") {
    if (params.id === admin.id) {
      return NextResponse.json({ error: "不能封禁自己" }, { status: 400 });
    }
    if (target.isAdmin) {
      return NextResponse.json(
        { error: "不能封禁管理员账号" },
        { status: 400 }
      );
    }
    await prisma.user.update({
      where: { id: params.id },
      data: { banned: body.banned },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "无有效操作" }, { status: 400 });
}
