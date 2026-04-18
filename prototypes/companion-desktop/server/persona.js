// persona.js — load .companion bundles (zip) or plain persona directories.
//
// A valid persona contains:
//   manifest.json   { name, version, voice: { engine, speaker }, traits?, signaturePhrases? }
//   avatar.vrm      3D model
//   persona.md      (optional) system-prompt fragment
//
// For the on-screen runtime we only need avatar.vrm + voice.speaker.
// The persona.md travels with the bundle for Claude-side skills to read.

import { createReadStream, existsSync, mkdirSync } from "node:fs";
import { readFile, copyFile, rm } from "node:fs/promises";
import { dirname, resolve, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import AdmZip from "adm-zip";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const AVATAR_DIR = resolve(ROOT, "avatars");
const STATE_DIR = resolve(ROOT, "state", "persona");

mkdirSync(STATE_DIR, { recursive: true });

export async function loadBundle(bundlePath) {
  if (!existsSync(bundlePath)) {
    throw new Error(`bundle not found: ${bundlePath}`);
  }

  // Clean staging dir each time so we don't accumulate.
  await rm(STATE_DIR, { recursive: true, force: true }).catch(() => {});
  mkdirSync(STATE_DIR, { recursive: true });

  const ext = extname(bundlePath).toLowerCase();
  if (ext === ".companion" || ext === ".zip") {
    const zip = new AdmZip(bundlePath);
    zip.extractAllTo(STATE_DIR, true);
  } else {
    // treat as a directory of persona files
    const { cp } = await import("node:fs/promises");
    await cp(bundlePath, STATE_DIR, { recursive: true });
  }

  const manifestPath = resolve(STATE_DIR, "manifest.json");
  if (!existsSync(manifestPath)) {
    throw new Error("manifest.json missing in bundle");
  }
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

  const vrmSrc = resolve(STATE_DIR, manifest.avatar || "avatar.vrm");
  if (!existsSync(vrmSrc)) {
    throw new Error(`avatar vrm missing: ${manifest.avatar || "avatar.vrm"}`);
  }

  // Copy into the static avatars/ dir with a predictable name so browser can fetch it.
  const avatarTarget = resolve(AVATAR_DIR, "current.vrm");
  mkdirSync(AVATAR_DIR, { recursive: true });
  await copyFile(vrmSrc, avatarTarget);

  return {
    name: manifest.name || basename(bundlePath, ext),
    avatarUrl: `/avatars/current.vrm?ts=${Date.now()}`,
    speaker: manifest.voice?.speaker ?? null,
    engine: manifest.voice?.engine || "voicevox",
    manifest,
  };
}
