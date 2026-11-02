#!/usr/bin/env node
/**
 * Dual-process local mode (recommended):
 *   player → 0.0.0.0:80 (or 3000)  http://www.kar1nteaseparadise.com
 *   admin  → 127.0.0.1:3001 only   http://127.0.0.1:3001
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const runSite = path.join(__dirname, "run-site.mjs");

const children = [];

function start(role) {
  const child = spawn(process.execPath, [runSite, role, "dev"], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
  children.push(child);
  child.on("exit", (code, signal) => {
    // If one dies, tear down the other.
    for (const c of children) {
      if (c !== child && !c.killed) c.kill("SIGTERM");
    }
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 1);
  });
  return child;
}

start("player");
start("admin");

function shutdown() {
  for (const c of children) {
    if (!c.killed) c.kill("SIGTERM");
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
