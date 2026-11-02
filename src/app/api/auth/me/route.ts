import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ user: null });
  }
  const fresh = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!fresh || fresh.banned) {
    session.destroy();
    return NextResponse.json({ user: null, banned: !!fresh?.banned });
  }
  return NextResponse.json({
    user: {
      id: fresh.id,
      username: fresh.username,
      isAdmin: fresh.isAdmin,
    },
  });
}
