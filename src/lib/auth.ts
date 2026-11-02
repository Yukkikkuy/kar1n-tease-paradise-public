import bcrypt from "bcryptjs";
import { prisma } from "./db";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function getFreshUser(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}

/** Server-side: can this user play this game? */
export async function canPlayGame(userId: string, gameId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.banned) {
    return { ok: false as const, reason: "banned" as const };
  }
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || !game.published) {
    return { ok: false as const, reason: "not_found" as const };
  }
  if (game.isFree || user.isAdmin) {
    return { ok: true as const, game };
  }
  const activation = await prisma.activation.findUnique({
    where: { userId_gameId: { userId, gameId } },
  });
  if (!activation) {
    return { ok: false as const, reason: "locked" as const };
  }
  return { ok: true as const, game };
}
