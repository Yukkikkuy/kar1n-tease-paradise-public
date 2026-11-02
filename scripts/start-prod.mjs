#!/usr/bin/env node
/**
 * Railway / production entry:
 * 1) ensure UPLOAD_DIR exists
 * 2) prisma migrate deploy
 * 3) next start bound to 0.0.0.0:$PORT
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const uploadDir =
  process.env.UPLOAD_DIR?.trim() ||
  path.join(root, "public", "uploads");
try {
  mkdirSync(uploadDir, { recursive: true });
  console.log(`[start-prod] UPLOAD_DIR=${uploadDir}`);
} catch (err) {
  console.warn(`[start-prod] could not create upload dir: ${err}`);
}

const port = String(process.env.PORT || "3000");
// Never use Railway's HOSTNAME (container id); always bind all interfaces.
const bindHost = process.env.BIND_HOST || "0.0.0.0";

const env = {
  ...process.env,
  SITE_ROLE: process.env.SITE_ROLE || "all",
  NEXT_PUBLIC_SITE_ROLE: process.env.NEXT_PUBLIC_SITE_ROLE || process.env.SITE_ROLE || "all",
  UPLOAD_DIR: uploadDir,
  PORT: port,
  NODE_ENV: process.env.NODE_ENV || "production",
};

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: root,
      env,
      stdio: "inherit",
      shell: false,
    });
    child.on("exit", (code, signal) => {
      if (signal) reject(new Error(`killed by ${signal}`));
      else if (code !== 0) reject(new Error(`exit ${code}`));
      else resolve();
    });
  });
}

const prismaBin = path.join(root, "node_modules", "prisma", "build", "index.js");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");

try {
  console.log("[start-prod] prisma migrate deploy…");
  await run(process.execPath, [prismaBin, "migrate", "deploy"]);
} catch (err) {
  console.error("[start-prod] migrate failed:", err.message || err);
  process.exit(1);
}

console.log(`[start-prod] next start -H ${bindHost} -p ${port}`);
try {
  await run(process.execPath, [nextBin, "start", "-H", bindHost, "-p", port]);
} catch (err) {
  console.error("[start-prod] next start failed:", err.message || err);
  process.exit(1);
}
