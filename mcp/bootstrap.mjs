#!/usr/bin/env node
// bootstrap.mjs — ensure runner + mcp dependencies are installed before first run.
//
// Called once from plugin post-install hook (or manually). Idempotent.

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, "..");
const RUNNER_ROOT = resolve(PLUGIN_ROOT, "prototypes", "companion-desktop");

function npmInstall(cwd, label) {
  const nm = resolve(cwd, "node_modules");
  if (existsSync(nm)) {
    console.log(`[bootstrap] ${label}: node_modules already present`);
    return;
  }
  console.log(`[bootstrap] npm install in ${label}...`);
  const r = spawnSync("npm", ["install", "--omit=dev"], {
    cwd,
    stdio: "inherit",
    shell: true,
  });
  if (r.status !== 0) {
    throw new Error(`npm install failed in ${label}`);
  }
}

npmInstall(__dirname, "mcp");
npmInstall(RUNNER_ROOT, "runner");

console.log("[bootstrap] done");
