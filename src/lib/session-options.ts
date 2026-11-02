import type { SessionOptions } from "iron-session";
import type { SessionUser } from "./types";

export interface SessionData {
  user?: SessionUser;
}

export const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_SECRET ||
    "text-adventure-dev-secret-change-me-32chars!!",
  cookieName: "ta_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 14,
  },
};
