import path from "path";

/**
 * Persistent upload root.
 * - Production / Railway: set UPLOAD_DIR=/data/uploads (Volume mount)
 * - Local default: <cwd>/public/uploads (served via /api/media rewrite)
 */
export function getUploadRoot(): string {
  const fromEnv = process.env.UPLOAD_DIR?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.join(process.cwd(), "public", "uploads");
}

/** Resolve a relative path under the upload root; null if unsafe. */
export function resolveUploadPath(...parts: string[]): string | null {
  if (!parts.length || parts.some((p) => p === ".." || p.includes("\0") || !p)) {
    return null;
  }
  const root = path.resolve(getUploadRoot());
  const full = path.normalize(path.join(root, ...parts));
  if (full !== root && !full.startsWith(root + path.sep)) return null;
  return full;
}
