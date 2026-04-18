// Download a free sample VRM as a starter avatar.
//
// Usage:  node scripts/download-avatar.mjs
//
// Source: @pixiv/three-vrm examples (Apache-2.0 / bundled sample models).
// This is a *placeholder* avatar so the pipeline is testable end-to-end.
// Replace with a custom VRM produced in VRoid Studio when ready.

import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const target = resolve(__dirname, "..", "avatars", "companion.vrm");

// three-vrm bundled sample — VRM 0.x, female, anime style.
// License: see https://github.com/pixiv/three-vrm (MIT for code, sample model
// VRoid Hub terms). Used here only as a prototype placeholder.
const url =
  "https://cdn.jsdelivr.net/gh/pixiv/three-vrm@dev/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm";

mkdirSync(dirname(target), { recursive: true });

if (existsSync(target)) {
  console.log(`[download-avatar] Already exists: ${target}`);
  console.log("[download-avatar] Delete it and re-run to redownload.");
  process.exit(0);
}

console.log(`[download-avatar] Fetching ${url}`);
const res = await fetch(url);
if (!res.ok || !res.body) {
  console.error(`[download-avatar] HTTP ${res.status} ${res.statusText}`);
  console.error("[download-avatar] See avatars/README.md for manual options.");
  process.exit(1);
}

await pipeline(res.body, createWriteStream(target));
console.log(`[download-avatar] Saved: ${target}`);
console.log("[download-avatar] This is a placeholder — swap with your own VRM when ready.");
