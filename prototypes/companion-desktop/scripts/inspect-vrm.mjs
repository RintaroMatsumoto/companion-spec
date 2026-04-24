// Minimal VRM inspector.
//
// Dumps the glTF JSON chunk of a .vrm file and reports:
// - VRM version (0.x via `extensions.VRM`, 1.0 via `extensions.VRMC_vrm`)
// - Humanoid bone coverage (required bones from the VRM spec)
// - Expression / BlendShape coverage (happy, angry, relaxed, neutral, sad,
//   surprised, blink, aa) — what companion-desktop's main.js expects.
//
// Usage:  node scripts/inspect-vrm.mjs <path/to/model.vrm> [more.vrm ...]

import { readFile } from "node:fs/promises";
import { basename } from "node:path";

const REQUIRED_HUMANOID = [
  "hips",
  "spine",
  "chest",
  "neck",
  "head",
  "leftUpperArm",
  "leftLowerArm",
  "leftHand",
  "rightUpperArm",
  "rightLowerArm",
  "rightHand",
  "leftUpperLeg",
  "leftLowerLeg",
  "leftFoot",
  "rightUpperLeg",
  "rightLowerLeg",
  "rightFoot",
];

// companion-desktop/public/main.js reads these presets from the VRM
// expression manager.
const REQUIRED_EXPRESSIONS = [
  "happy",
  "angry",
  "sad",
  "relaxed",
  "surprised",
  "neutral",
  "blink",
  "aa",
];

function readGltfChunk(buf) {
  // GLB header: magic (u32) version (u32) length (u32)
  const magic = buf.readUInt32LE(0);
  if (magic !== 0x46546c67) {
    throw new Error("not a GLB container (magic mismatch)");
  }
  const chunkLen = buf.readUInt32LE(12);
  const chunkType = buf.readUInt32LE(16);
  if (chunkType !== 0x4e4f534a) {
    throw new Error("first chunk is not JSON");
  }
  const jsonBytes = buf.subarray(20, 20 + chunkLen);
  // trailing padding may be spaces (0x20) — JSON.parse tolerates trailing ws
  return JSON.parse(jsonBytes.toString("utf-8"));
}

function inspectVrm0(gltf, report) {
  const vrm = gltf.extensions?.VRM;
  report.version = "0.x";
  report.meta = vrm?.meta ?? null;
  const humanBones = vrm?.humanoid?.humanBones ?? [];
  const haveBones = new Set(humanBones.map((b) => b.bone));
  report.humanoidBones = {
    have: [...haveBones].sort(),
    missing: REQUIRED_HUMANOID.filter((b) => !haveBones.has(b)),
  };
  const blendShapeGroups = vrm?.blendShapeMaster?.blendShapeGroups ?? [];
  // VRM 0.x uses names like "Joy", "Angry", "Sorrow", "Fun", "Neutral",
  // "Blink", "A", "I", "U", "E", "O". three-vrm normalizes these to the
  // 1.0 preset names at runtime, so we check both forms.
  const presetMap = {
    joy: "happy",
    angry: "angry",
    sorrow: "sad",
    fun: "relaxed",
    neutral: "neutral",
    blink: "blink",
    a: "aa",
    i: "ih",
    u: "ou",
    e: "ee",
    o: "oh",
    surprised: "surprised",
  };
  const normalized = new Set();
  for (const g of blendShapeGroups) {
    const raw = (g.presetName ?? g.name ?? "").toString().toLowerCase();
    if (presetMap[raw]) normalized.add(presetMap[raw]);
    else normalized.add(raw);
  }
  report.expressions = {
    have: [...normalized].sort(),
    missing: REQUIRED_EXPRESSIONS.filter((e) => !normalized.has(e)),
  };
}

function inspectVrm1(gltf, report) {
  const vrm = gltf.extensions?.VRMC_vrm;
  report.version = "1.0";
  report.meta = vrm?.meta ?? null;
  const humanBones = vrm?.humanoid?.humanBones ?? {};
  const haveBones = new Set(Object.keys(humanBones));
  report.humanoidBones = {
    have: [...haveBones].sort(),
    missing: REQUIRED_HUMANOID.filter((b) => !haveBones.has(b)),
  };
  const preset = vrm?.expressions?.preset ?? {};
  const custom = vrm?.expressions?.custom ?? {};
  const have = new Set([...Object.keys(preset), ...Object.keys(custom)]);
  report.expressions = {
    have: [...have].sort(),
    missing: REQUIRED_EXPRESSIONS.filter((e) => !have.has(e)),
  };
}

async function inspect(path) {
  const buf = await readFile(path);
  const gltf = readGltfChunk(buf);
  const report = { file: basename(path), bytes: buf.length };
  const exts = Object.keys(gltf.extensions ?? {});
  report.extensions = exts;
  if (gltf.extensions?.VRMC_vrm) inspectVrm1(gltf, report);
  else if (gltf.extensions?.VRM) inspectVrm0(gltf, report);
  else {
    report.version = "unknown";
    report.error = "no VRM or VRMC_vrm extension found";
  }
  return report;
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("usage: node scripts/inspect-vrm.mjs <file.vrm> [more.vrm ...]");
  process.exit(2);
}

for (const f of files) {
  try {
    const r = await inspect(f);
    console.log(JSON.stringify(r, null, 2));
    console.log("---");
  } catch (err) {
    console.error(`[inspect-vrm] ${f}: ${err.message}`);
  }
}
