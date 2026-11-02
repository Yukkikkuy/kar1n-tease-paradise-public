import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]{2,24}$/.test(username)) {
      return NextResponse.json(
        { error: "用户名需 2–24 位，可用中文、字母、数字、下划线" },
        { status: 400 }
      );
    }
    if (password.length < 4) {
      return NextResponse.json({ error: "密码至少 4 位" }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) {
      return NextResponse.json({ error: "用户名已被占用" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { username, passwordHash },
    });

    const session = await getSession();
    session.user = { id: user.id, username: user.username, isAdmin: false };
    await session.save();

    return NextResponse.json({
      ok: true,
      user: { id: user.id, username: user.username, isAdmin: false },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "注册失败" }, { status: 500 });
  }
}
