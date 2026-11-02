#!/usr/bin/env node
/**
 * Launch player / admin Next.js site.
 * Usage: node scripts/run-site.mjs <player|admin> [dev|start|build] [port?]
 *
 * player → 0.0.0.0:80 (fallback 3000), domain http://www.kar1nteaseparadise.com
 * admin  → 127.0.0.1:3001 only (not LAN), http://127.0.0.1:3001
 */
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const roleArg = (process.argv[2] || "").toLowerCase();
const mode = (process.argv[3] || "dev").toLowerCase();
const portOverride = process.argv[4];

if (!["player", "admin"].includes(roleArg)) {
  console.error(
    "Usage: node scripts/run-site.mjs <player|admin> [dev|start|build] [port]"
  );
  process.exit(1);
}

const PLAYER_HOST = "www.kar1nteaseparadise.com";
const ADMIN_ORIGIN = "http://127.0.0.1:3001";

function canListen(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.listen(port, host, () => {
      server.close(() => resolve(true));
    });
  });
}

async function pickPort(role) {
  if (portOverride) return String(portOverride);
  if (role === "admin") return "3001";
  // player: prefer 80 (normal website URL without :port)
  if (await canListen(80, "0.0.0.0")) return "80";
  if (await canListen(3000, "0.0.0.0")) return "3000";
  return "3000";
}

function playerOrigin(port) {
  const p = String(port);
  if (p === "80") return `http://${PLAYER_HOST}`;
  return `http://${PLAYER_HOST}:${p}`;
}

const port = await pickPort(roleArg);
const bindHost = roleArg === "admin" ? "127.0.0.1" : "0.0.0.0";

const resolvedPlayerUrl =
  process.env.PLAYER_SITE_URL ||
  (roleArg === "player" ? playerOrigin(port) : playerOrigin("80"));
const resolvedAdminUrl = process.env.ADMIN_SITE_URL || ADMIN_ORIGIN;

const env = {
  ...process.env,
  SITE_ROLE: roleArg,
  NEXT_PUBLIC_SITE_ROLE: roleArg,
  PLAYER_SITE_URL: resolvedPlayerUrl,
  ADMIN_SITE_URL: resolvedAdminUrl,
  NEXT_PUBLIC_PLAYER_SITE_URL: resolvedPlayerUrl,
  NEXT_PUBLIC_ADMIN_SITE_URL: resolvedAdminUrl,
  PORT: port,
};

const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");

let args;
if (mode === "build") {
  args = [nextBin, "build"];
} else if (mode === "start") {
  args = [nextBin, "start", "-H", bindHost, "-p", port];
} else {
  args = [nextBin, "dev", "-H", bindHost, "-p", port];
}

console.log(`[run-site] role=${roleArg} mode=${mode} bind=${bindHost}:${port}`);
console.log(`[run-site] player → ${resolvedPlayerUrl}`);
console.log(`[run-site] admin  → ${resolvedAdminUrl}`);
if (roleArg === "player" && port !== "80") {
  console.log(
    `[run-site] note: port 80 unavailable — open ${resolvedPlayerUrl}`
  );
}
if (roleArg === "admin") {
  console.log(`[run-site] admin is loopback-only (not exposed to LAN)`);
}

const child = spawn(process.execPath, args, {
  cwd: root,
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
