export type SiteRole = "player" | "admin" | "all";

/** Public brand (display). */
export const SITE_BRAND = "Kar1n Tease Paradise";
export const SITE_BRAND_ZH_SUB = "分支剧情文字冒险";

/** Canonical player hostnames (lowercase, no port). */
export const PLAYER_HOSTS = [
  "www.kar1nteaseparadise.com",
  "kar1nteaseparadise.com",
] as const;

/** Optional admin hostnames (e.g. Railway custom domain admin.*). */
export const ADMIN_HOSTS = ["admin.kar1nteaseparadise.com"] as const;

/** Default public origins. Local admin is loopback-only. */
export const DEFAULT_PLAYER_SITE_URL = "http://www.kar1nteaseparadise.com";
export const DEFAULT_ADMIN_SITE_URL = "http://127.0.0.1:3001";

function stripPort(hostHeader: string): string {
  const raw = hostHeader.trim().toLowerCase();
  if (raw.startsWith("[")) {
    const end = raw.indexOf("]");
    if (end !== -1) return raw.slice(0, end + 1);
  }
  const idx = raw.lastIndexOf(":");
  if (idx > -1 && raw.indexOf(":") === idx) return raw.slice(0, idx);
  return raw;
}

/**
 * Resolve role from Host header when not forced by SITE_ROLE.
 * Known player domains → player; known admin domains → admin; else null.
 */
export function roleFromHost(
  hostHeader: string | null | undefined
): SiteRole | null {
  if (!hostHeader) return null;
  const host = stripPort(hostHeader);
  if ((PLAYER_HOSTS as readonly string[]).includes(host)) return "player";
  if ((ADMIN_HOSTS as readonly string[]).includes(host)) return "admin";
  return null;
}

/**
 * Env SITE_ROLE:
 * - player: public player-only (blocks /admin)
 * - admin: local admin process
 * - all: single public service (player + /admin behind login) — Railway default
 */
export function getEnvSiteRole(): SiteRole {
  const raw = (
    process.env.SITE_ROLE ||
    process.env.NEXT_PUBLIC_SITE_ROLE ||
    ""
  ).toLowerCase();
  if (raw === "admin") return "admin";
  if (raw === "player") return "player";
  if (raw === "all" || raw === "combined" || raw === "public") return "all";
  // Production single-service default
  if (process.env.NODE_ENV === "production") return "all";
  return "player";
}

/**
 * Prefer explicit SITE_ROLE=all / admin / player.
 * For dual-process local: Host player domain still forces player when SITE_ROLE=player.
 * When SITE_ROLE=all, Host does not split (one public app).
 */
export function getSiteRole(hostHeader?: string | null): SiteRole {
  const envRole = getEnvSiteRole();
  if (envRole === "all") return "all";
  if (envRole === "admin") return "admin";
  // player (or default): Host can confirm player domain
  return roleFromHost(hostHeader) ?? envRole;
}

export function getPlayerSiteUrl(): string {
  return (
    process.env.PLAYER_SITE_URL ||
    process.env.NEXT_PUBLIC_PLAYER_SITE_URL ||
    DEFAULT_PLAYER_SITE_URL
  );
}

export function getAdminSiteUrl(): string {
  return (
    process.env.ADMIN_SITE_URL ||
    process.env.NEXT_PUBLIC_ADMIN_SITE_URL ||
    DEFAULT_ADMIN_SITE_URL
  );
}

export function isAdminPath(pathname: string): boolean {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/editor" ||
    pathname.startsWith("/editor/") ||
    pathname.startsWith("/api/admin")
  );
}

/** True when this process serves admin UI (dedicated admin or public all). */
export function servesAdmin(role: SiteRole): boolean {
  return role === "admin" || role === "all";
}
