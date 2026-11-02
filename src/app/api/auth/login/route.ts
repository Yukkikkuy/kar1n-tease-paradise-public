import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const adminOnly = !!body.adminOnly;
    const playerOnly = !!body.playerOnly;

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
    }
    if (user.banned) {
      return NextResponse.json(
        { error: "该账号已被永久封禁，无法登录" },
        { status: 403 }
      );
    }

    if (adminOnly && !user.isAdmin) {
      return NextResponse.json(
        { error: "此入口仅供管理员。玩家请前往前台登录。" },
        { status: 403 }
      );
    }
    if (playerOnly && user.isAdmin) {
      return NextResponse.json(
        { error: "管理员请使用后台登录入口" },
        { status: 403 }
      );
    }

    const session = await getSession();
    session.user = {
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
    };
    await session.save();

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "登录失败" }, { status: 500 });
  }
}
