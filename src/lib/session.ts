import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "./session-options";

export type { SessionData } from "./session-options";
export { sessionOptions };

export async function getSession() {
  return getIronSession<SessionData>(cookies(), sessionOptions);
}

export async function requireUser() {
  const session = await getSession();
  if (!session.user) return null;
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user || !user.isAdmin) return null;
  return user;
}
