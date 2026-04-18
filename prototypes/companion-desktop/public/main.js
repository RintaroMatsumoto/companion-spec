// companion-desktop — browser renderer.
//
// - Three.js scene, transparent bg (Chrome app-mode shows desktop behind).
// - @pixiv/three-vrm loads avatars/companion.vrm.
// - WebSocket receives { type: "say", audio: base64, emotion }.
// - Lip sync: Web Audio Analyser → RMS → VRM expression "aa".
// - Emotion: mapped to VRM expression presets (happy / angry / neutral / relaxed).

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  VRMLoaderPlugin,
  VRMUtils,
  VRMHumanBoneName,
} from "@pixiv/three-vrm";

const statusEl = document.getElementById("status");
const captionEl = document.getElementById("caption");
const canvas = document.getElementById("stage");

function setStatus(msg) {
  statusEl.textContent = msg;
}
function showCaption(text) {
  captionEl.textContent = text;
  captionEl.classList.add("visible");
  clearTimeout(showCaption._t);
  showCaption._t = setTimeout(() => captionEl.classList.remove("visible"), 6000);
}

// ---------------- Three.js scene ----------------
const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
camera.position.set(0, 1.3, 2.2);
camera.lookAt(0, 1.2, 0);

const light = new THREE.DirectionalLight(0xffffff, 1.6);
light.position.set(1, 2, 1);
scene.add(light);
scene.add(new THREE.AmbientLight(0xc8d0ff, 0.45));

// ---------------- VRM load ----------------
// Must be declared before resize() since resize() reads currentVRM and
// is called at module-init time. (Temporal dead zone trap.)
let currentVRM = null;

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (currentVRM) frameCameraOnHead(currentVRM);
}
resize();
window.addEventListener("resize", resize);

const loader = new GLTFLoader();
loader.register((parser) => new VRMLoaderPlugin(parser));

// Candidate VRM sources for the initial boot. `/avatars/current.vrm` is
// written by /persona/load (optional); fall back to the bundled companion.vrm.
const VRM_CANDIDATES = [
  "/avatars/current.vrm",
  "/avatars/companion.vrm",
];

// Single source of truth for "which avatar is on screen" and
// "is a load currently in progress". See TOOLBOX §1.7 (avatar hot-swap).
let currentAvatarUrl = null;
let avatarLoadingPromise = null;

// Forward-declared here to avoid TDZ when onVrmLoaded (called from an
// async load path) resets the counter. See TOOLBOX §4.1.
let idleFrameCount = 0;

function onVrmLoaded(gltf) {
  const vrm = gltf.userData.vrm;
  if (!vrm) {
    throw new Error("gltf.userData.vrm is null — file is not a VRM?");
  }
  // Optional optimizations — guard each since three-vrm 3.x dropped some.
  try {
    if (typeof VRMUtils.removeUnnecessaryVertices === "function") {
      VRMUtils.removeUnnecessaryVertices(gltf.scene);
    }
  } catch (e) { console.warn("VRMUtils optimize skipped:", e); }

  scene.add(vrm.scene);
  currentVRM = vrm;
  idleFrameCount = 0; // reset so the bone-diagnostic log fires for the new avatar

  // Orientation: ADR-0003. rotateVRM0 is a no-op for VRM 1.0, safe to call
  // unconditionally. Never write `vrm.scene.rotation.y = Math.PI` by hand.
  if (typeof VRMUtils.rotateVRM0 === "function") {
    try { VRMUtils.rotateVRM0(vrm); } catch (e) { console.warn(e); }
  }

  // LookAt: disable auto-update. VRMLookAt writes the HEAD bone's quaternion
  // every frame inside vrm.update() — silently overwriting our idle
  // animation. Confirmed by the official bones.html example which rotates
  // `neck` (not `head`) for this exact reason.
  // Source: https://github.com/pixiv/three-vrm/blob/v3.1.4/packages/three-vrm/examples/bones.html
  if (vrm.lookAt) {
    vrm.lookAt.target = null;
    vrm.lookAt.autoUpdate = false;
  }

  // Pose: ADR-0001. Operate on normalized humanoid bones only.
  applyAPose(vrm);
  vrm.update(0); // flush normalized → raw for camera framing

  applyEmotion("calm");

  try {
    frameCameraOnHead(vrm);
  } catch (e) {
    console.warn("frameCameraOnHead failed — falling back to default camera:", e);
    camera.position.set(0, 1.3, 2.2);
    camera.lookAt(0, 1.2, 0);
  }
  setStatus("ready");
  console.log("[vrm] loaded", vrm);
}

// Frame the camera on the Head bone's world position — robust across
// VRMs of varying scales/origins. See ADR-0002; Box3 is explicitly avoided
// because spring-bone colliders and hidden first-person meshes inflate it.
function frameCameraOnHead(vrm) {
  vrm.scene.updateMatrixWorld(true);
  const head = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.Head);
  if (!head) return;
  const headPos = new THREE.Vector3();
  head.getWorldPosition(headPos);
  // Stand slightly below head height, 0.9 m back — shows head + upper torso.
  camera.position.set(headPos.x, headPos.y - 0.05, headPos.z + 0.9);
  camera.lookAt(headPos.x, headPos.y - 0.10, headPos.z);
  camera.near = 0.05;
  camera.far = 20;
  camera.updateProjectionMatrix();
}

// ---------------- A-pose + idle animation ----------------
// Operate on NORMALIZED humanoid bones only. See ADR-0001.
// Sign convention (three.js right-hand, normalized rest = identity):
//   LeftUpperArm.rotation.z  positive  → left arm goes UP (banzai)
//   LeftUpperArm.rotation.z  negative  → left arm goes DOWN (A-pose)
//   Right side mirrors.
// Default is a gentle ~20° A-pose (±0.35 rad) — Animaze's 70° was too stiff.
const A_POSE_UPPER = 0.35;
const A_POSE_LOWER = 0.10;

function applyAPose(vrm) {
  const h = vrm.humanoid;
  if (!h) return;
  const set = (boneName, euler) => {
    const node = h.getNormalizedBoneNode(boneName);
    if (!node) return;
    if (euler.x !== undefined) node.rotation.x = euler.x;
    if (euler.y !== undefined) node.rotation.y = euler.y;
    if (euler.z !== undefined) node.rotation.z = euler.z;
  };
  set(VRMHumanBoneName.LeftUpperArm,  { z: -A_POSE_UPPER });
  set(VRMHumanBoneName.RightUpperArm, { z:  A_POSE_UPPER });
  set(VRMHumanBoneName.LeftLowerArm,  { z: -A_POSE_LOWER });
  set(VRMHumanBoneName.RightLowerArm, { z:  A_POSE_LOWER });
}

// Idle の目標：画面越しでも「動いてる」と認識できる量。
// 人間の自然呼吸より少し大きめ・速めにする（TV アニメの棒立ちカットと同じ誇張）。
const BREATH_HZ = 0.33;   // 20/min、自然呼吸よりやや速い
const TAU = Math.PI * 2;

function updateIdle(vrm, now) {
  if (!vrm?.humanoid) return;
  const t = now / 1000;
  const h = vrm.humanoid;

  // 初回のみ、どのボーンが取れたかをログ（null でないかの目視確認用）
  if (idleFrameCount === 0) {
    const diag = {};
    for (const bone of [
      VRMHumanBoneName.Spine, VRMHumanBoneName.Chest, VRMHumanBoneName.Head,
      VRMHumanBoneName.Neck, VRMHumanBoneName.Hips,
      VRMHumanBoneName.LeftUpperArm, VRMHumanBoneName.RightUpperArm,
      VRMHumanBoneName.LeftLowerArm, VRMHumanBoneName.RightLowerArm,
      VRMHumanBoneName.LeftShoulder, VRMHumanBoneName.RightShoulder,
    ]) {
      diag[bone] = !!h.getNormalizedBoneNode(bone);
    }
    console.log("[idle] normalized bones available:", diag);
  }
  idleFrameCount++;

  const breath = Math.sin(t * BREATH_HZ * TAU);
  const breathNext = Math.sin(t * BREATH_HZ * TAU + 0.4);

  // 呼吸：脊柱 & 胸（やや誇張）
  const spine = h.getNormalizedBoneNode(VRMHumanBoneName.Spine);
  if (spine) spine.rotation.x = breath * 0.06;            // ±3.4°
  const chest = h.getNormalizedBoneNode(VRMHumanBoneName.Chest);
  if (chest) chest.rotation.x = breathNext * 0.05;         // ±2.9°

  // 頭部 look-around：`neck` に書く（`head` ではなく）。
  // 理由：`VRMLookAt` が `head.quaternion` を `vrm.update()` 内で
  // 上書きしうる。公式 bones.html も `neck` を回している。
  // lookAt.autoUpdate は onVrmLoaded で false にしているが、neck を
  // 使う方がアバター差し替え時も安全。
  const neck = h.getNormalizedBoneNode(VRMHumanBoneName.Neck);
  if (neck) {
    neck.rotation.y = Math.sin(t * 0.55)        * 0.22;   // ±12.6° yaw
    neck.rotation.x = Math.cos(t * 0.37 + 1.1)  * 0.10;   // ±5.7° pitch
    neck.rotation.z = Math.sin(t * 0.23 + 0.7)  * 0.08;   // ±4.6° roll
  }

  // 頭：首との差分として、さらに細かい揺らぎを重ねる（二段動き）
  const head = h.getNormalizedBoneNode(VRMHumanBoneName.Head);
  if (head) {
    head.rotation.y = Math.sin(t * 0.73 + 0.5) * 0.04;
    head.rotation.x = Math.sin(t * 0.53 + 0.2) * 0.025;
  }

  // 重心：左右荷重移動のみ。
  // NOTE: hips.position.y を絶対値で書くと rest pose の高さ（~0.9m）を上書きして
  //       アバター全体が床にめり込む。呼吸感は脊柱・胸・肩の回転で既に十分出る。
  const hips = h.getNormalizedBoneNode(VRMHumanBoneName.Hips);
  if (hips) {
    hips.rotation.z = Math.sin(t * 0.27)       * 0.07;      // ±4° 傾き
    hips.rotation.y = Math.sin(t * 0.21 + 0.3) * 0.08;      // ±4.6° ひねり
  }

  // 腕：A-pose を中心に呼吸で開閉
  const armOpen  = breath * 0.08;                           // ±4.6°
  const armSwing = Math.sin(t * 0.41) * 0.06;               // ±3.4°
  const foreArm  = -breath * 0.06;                          // 逆位相

  const lUp = h.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm);
  if (lUp) lUp.rotation.z = -A_POSE_UPPER - armOpen - armSwing;
  const rUp = h.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm);
  if (rUp) rUp.rotation.z =  A_POSE_UPPER + armOpen + armSwing;

  const lLow = h.getNormalizedBoneNode(VRMHumanBoneName.LeftLowerArm);
  if (lLow) lLow.rotation.z = -A_POSE_LOWER - foreArm;
  const rLow = h.getNormalizedBoneNode(VRMHumanBoneName.RightLowerArm);
  if (rLow) rLow.rotation.z =  A_POSE_LOWER + foreArm;

  // 肩：呼吸で上下
  const lSh = h.getNormalizedBoneNode(VRMHumanBoneName.LeftShoulder);
  if (lSh) lSh.rotation.z = -breath * 0.04;
  const rSh = h.getNormalizedBoneNode(VRMHumanBoneName.RightShoulder);
  if (rSh) rSh.rotation.z =  breath * 0.04;
}

// Load one specific URL. Throws on network / parse failure.
function loadVrmFromUrl(url) {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => resolve(gltf),
      (p) => {
        if (p && p.total) {
          setStatus(
            `loading ${url} — ${Math.round((p.loaded / p.total) * 100)}%`,
          );
        }
      },
      (err) => reject(err),
    );
  });
}

// Single unified avatar loader.
// - Dedups by URL (no-op if already loaded).
// - Serializes concurrent calls (any in-flight load completes first).
// - Accepts either a single URL or an array of candidates; the first
//   successful candidate wins.
// Called by both the initial boot (COMPANION_CANDIDATES) and the WS
// `persona` message. See TOOLBOX §1.7.
async function loadAvatar(urlOrCandidates) {
  const candidates = Array.isArray(urlOrCandidates)
    ? urlOrCandidates
    : [urlOrCandidates];

  // URL-dedup: if one of the candidates matches what's already loaded, no-op.
  if (currentVRM && candidates.includes(currentAvatarUrl)) {
    return;
  }

  // Serialize: if a load is in flight, wait for it, then re-check dedup.
  if (avatarLoadingPromise) {
    await avatarLoadingPromise;
    if (currentVRM && candidates.includes(currentAvatarUrl)) {
      return;
    }
  }

  avatarLoadingPromise = (async () => {
    // Dispose the old one before we start fetching the new one.
    if (currentVRM) {
      scene.remove(currentVRM.scene);
      if (typeof VRMUtils.deepDispose === "function") {
        try { VRMUtils.deepDispose(currentVRM.scene); } catch (e) { console.warn(e); }
      }
      currentVRM = null;
      currentAvatarUrl = null;
    }

    for (const url of candidates) {
      setStatus(`loading avatar: ${url}`);
      try {
        const gltf = await loadVrmFromUrl(url);
        onVrmLoaded(gltf);
        currentAvatarUrl = url;
        return;
      } catch (err) {
        console.error(`[vrm] failed ${url}:`, err);
        setStatus(`avatar load failed: ${err?.message || err} — trying next`);
      }
    }
    setStatus("avatar load failed — all candidates exhausted (see console)");
  })();

  try {
    await avatarLoadingPromise;
  } finally {
    avatarLoadingPromise = null;
  }
}

// Boot: kick off the initial load. The WS `persona` message, when it
// arrives, will dedup-no-op if the same URL is already loaded.
loadAvatar(VRM_CANDIDATES);

// ---------------- Emotion → VRM expression ----------------
// VRM expression preset names (0.x / 1.0 compatible via three-vrm normalization):
//   happy, angry, sad, relaxed, surprised, neutral, aa, ih, ou, ee, oh, blink
const EMOTION_MAP = {
  calm:     { happy: 0.0,  angry: 0.0,  relaxed: 0.3, neutral: 0.5 },
  wry:      { happy: 0.25, angry: 0.0,  relaxed: 0.4, neutral: 0.2 },
  pleased:  { happy: 0.7,  angry: 0.0,  relaxed: 0.2, neutral: 0.0 },
  scolding: { happy: 0.0,  angry: 0.55, relaxed: 0.0, neutral: 0.2 },
};

function applyEmotion(tag) {
  if (!currentVRM?.expressionManager) return;
  const mix = EMOTION_MAP[tag] || EMOTION_MAP.calm;
  const mgr = currentVRM.expressionManager;
  // Reset emotion channels (keep viseme / blink alone).
  for (const name of ["happy", "angry", "sad", "relaxed", "surprised", "neutral"]) {
    mgr.setValue(name, 0);
  }
  for (const [name, value] of Object.entries(mix)) {
    mgr.setValue(name, value);
  }
}

// ---------------- Audio + lip sync ----------------
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioCtx.createAnalyser();
analyser.fftSize = 512;
analyser.smoothingTimeConstant = 0.7;
const ampData = new Uint8Array(analyser.frequencyBinCount);

let speaking = false;

async function playSayPayload({ audio, mime = "audio/wav", emotion, text }) {
  if (text) showCaption(text);
  applyEmotion(emotion || "calm");

  // base64 → ArrayBuffer
  const bin = atob(audio);
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);

  const audioBuffer = await audioCtx.decodeAudioData(buf);
  const source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(analyser);
  analyser.connect(audioCtx.destination);
  speaking = true;
  source.onended = () => {
    speaking = false;
    if (currentVRM?.expressionManager) {
      currentVRM.expressionManager.setValue("aa", 0);
    }
  };
  source.start();
}

// ---------------- Blink timer ----------------
let nextBlinkAt = performance.now() + 2500;
let blinkPhase = 0; // 0 idle, 1 closing, 2 opening
let blinkStart = 0;

function updateBlink(now) {
  if (!currentVRM?.expressionManager) return;
  const mgr = currentVRM.expressionManager;
  if (blinkPhase === 0 && now >= nextBlinkAt) {
    blinkPhase = 1;
    blinkStart = now;
  }
  if (blinkPhase !== 0) {
    const t = (now - blinkStart) / 120; // 120ms close, 120ms open
    if (t < 1) {
      mgr.setValue("blink", t);
    } else if (t < 2) {
      mgr.setValue("blink", 2 - t);
    } else {
      mgr.setValue("blink", 0);
      blinkPhase = 0;
      nextBlinkAt = now + 1800 + Math.random() * 3000;
    }
  }
}

// ---------------- Render loop ----------------
const clock = new THREE.Clock();
function tick() {
  const dt = clock.getDelta();
  const now = performance.now();

  if (currentVRM) {
    // lip sync
    if (speaking) {
      analyser.getByteFrequencyData(ampData);
      let sum = 0;
      // focus on lower-vocal band
      for (let i = 2; i < 32; i++) sum += ampData[i];
      const rms = sum / (30 * 255);
      const mouth = Math.min(1, Math.max(0, (rms - 0.05) * 2.2));
      currentVRM.expressionManager?.setValue("aa", mouth);
    }
    updateBlink(now);
    updateIdle(currentVRM, now);
    currentVRM.update(dt);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();

// ---------------- WebSocket ----------------
function connectWS() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${proto}//${location.host}/ws`);

  ws.addEventListener("open", () => {
    console.log("[ws] connected");
  });
  ws.addEventListener("message", async (ev) => {
    let msg;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      return;
    }
    if (msg.type === "say") {
      try {
        // Resume audio context on first user-triggered event.
        if (audioCtx.state === "suspended") await audioCtx.resume();
        await playSayPayload(msg);
      } catch (err) {
        console.error("play failed", err);
      }
    } else if (msg.type === "persona" && msg.avatarUrl) {
      try {
        await loadAvatar(msg.avatarUrl);
      } catch (err) {
        console.error("persona swap failed", err);
      }
    }
  });
  ws.addEventListener("close", () => {
    console.log("[ws] closed — retrying in 2s");
    setTimeout(connectWS, 2000);
  });
  ws.addEventListener("error", () => ws.close());
}
connectWS();

// Resume audio on any click (browsers require gesture).
window.addEventListener("click", () => {
  if (audioCtx.state === "suspended") audioCtx.resume();
}, { once: true });
