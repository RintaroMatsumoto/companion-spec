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


function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (currentVRM) frameCameraOnVRM(currentVRM);
}
resize();
window.addEventListener("resize", resize);

// ---------------- VRM load ----------------
let currentVRM = null;

const loader = new GLTFLoader();
loader.register((parser) => new VRMLoaderPlugin(parser));

// Candidate VRM sources — first is our bundled local file, then CDN fallbacks.
// Any single one that loads a humanoid-with-expressions is enough.
// `/avatars/current.vrm` is written by /persona/load; we try it first, then fall back.
const VRM_CANDIDATES = [
  "/avatars/current.vrm",
  "/avatars/companion.vrm",
];

function onVrmLoaded(gltf) {
  const vrm = gltf.userData.vrm;
  if (!vrm) {
    throw new Error("gltf.userData.vrm is null — file is not a VRM?");
  }
  try {
    if (typeof VRMUtils.removeUnnecessaryVertices === "function") {
      VRMUtils.removeUnnecessaryVertices(gltf.scene);
    }
    if (typeof VRMUtils.combineSkeletons === "function") {
      VRMUtils.combineSkeletons(gltf.scene);
    }
  } catch (e) {
    console.warn("VRMUtils optimize skipped:", e);
  }
  // VRM 1.0 already faces +Z (toward camera). VRM 0.x faces -Z — rotate only then.
  const metaVersion = vrm.meta?.metaVersion ?? "1";
  if (String(metaVersion).startsWith("0")) {
    vrm.scene.rotation.y = Math.PI;
    if (typeof VRMUtils.rotateVRM0 === "function") {
      try { VRMUtils.rotateVRM0(vrm); } catch (e) { console.warn("rotateVRM0 skipped:", e); }
    }
  }
  scene.add(vrm.scene);
  currentVRM = vrm;
  applyAPose(vrm);
  applyEmotion("calm");
  try {
    frameCameraOnVRM(vrm);
  } catch (e) {
    console.warn("frameCameraOnVRM failed — falling back to default camera:", e);
    camera.position.set(0, 1.3, 2.2);
    camera.lookAt(0, 1.2, 0);
  }
  setStatus("ready");
  console.log("[vrm] loaded", vrm);
}

// Auto-frame the camera on the VRM so she sits centered in view regardless
// of the VRM's internal scale / origin convention.
function frameCameraOnVRM(vrm) {
  // Force a world-matrix update so bounding box reflects the current pose.
  vrm.scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(vrm.scene);
  if (!isFinite(box.min.x) || box.isEmpty()) return;
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);
  // Target a point around the chest/face (upper third of the avatar).
  const target = new THREE.Vector3(
    center.x,
    box.min.y + size.y * 0.82,
    center.z,
  );
  // Distance so the full torso + head fits; FOV=30° ⇒ tan(15°)≈0.268.
  const frameHeight = size.y * 0.55; // show upper half
  const dist = frameHeight / 2 / Math.tan((camera.fov * Math.PI) / 360);
  camera.position.set(target.x, target.y, target.z + dist * 1.1);
  camera.lookAt(target);
  camera.near = Math.max(0.05, dist * 0.05);
  camera.far = dist * 10;
  camera.updateProjectionMatrix();
}

// ---------------- A-pose + idle animation ----------------
// Set a resting pose by rotating humanoid bones directly. VRM's default import
// pose is T-pose, which looks stiff. We rotate upper arms down to the sides,
// bend forearms slightly, and give the idle loop a gentle breath + sway.
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
  // Arms down at sides (A-pose, ~70° from horizontal).
  // Sign convention: for this VRM, +z on LeftUpperArm raises the arm (banzai);
  // we want it DOWN, so negate. Mirror on the right.
  set(VRMHumanBoneName.LeftUpperArm,  { z: -1.15 });
  set(VRMHumanBoneName.RightUpperArm, { z:  1.15 });
  // Forearms slightly forward + inward.
  set(VRMHumanBoneName.LeftLowerArm,  { y:  0.12, z: -0.05 });
  set(VRMHumanBoneName.RightLowerArm, { y: -0.12, z:  0.05 });
  // Relaxed hands.
  set(VRMHumanBoneName.LeftHand,  { z: -0.05 });
  set(VRMHumanBoneName.RightHand, { z:  0.05 });
  // Slight shoulder drop so arms don't hover off the torso.
  set(VRMHumanBoneName.LeftShoulder,  { z: -0.06 });
  set(VRMHumanBoneName.RightShoulder, { z:  0.06 });
}

function updateIdle(vrm, now) {
  if (!vrm?.humanoid) return;
  const t = now / 1000;
  const h = vrm.humanoid;
  // Breathing: tiny chest/spine pitch.
  const spine = h.getNormalizedBoneNode(VRMHumanBoneName.Spine);
  if (spine) spine.rotation.x = Math.sin(t * 1.6) * 0.02;
  const chest = h.getNormalizedBoneNode(VRMHumanBoneName.Chest);
  if (chest) chest.rotation.x = Math.sin(t * 1.6 + 0.3) * 0.015;
  // Head micro-sway (figure-8-ish via sin/cos phase).
  const head = h.getNormalizedBoneNode(VRMHumanBoneName.Head);
  if (head) {
    head.rotation.y = Math.sin(t * 0.45) * 0.06;
    head.rotation.x = Math.cos(t * 0.38) * 0.025;
  }
  // Upper body weight shift.
  const hips = h.getNormalizedBoneNode(VRMHumanBoneName.Hips);
  if (hips) hips.position.y = Math.sin(t * 1.6) * 0.008;
  // Arm micro-sway so she doesn't look frozen. Signs must match applyAPose.
  const armSway = Math.sin(t * 0.7) * 0.03;
  const lUp = h.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm);
  if (lUp) lUp.rotation.z = -1.15 - armSway;
  const rUp = h.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm);
  if (rUp) rUp.rotation.z =  1.15 + armSway;
}

async function tryLoadVrm(urls) {
  for (const url of urls) {
    setStatus(`loading avatar: ${url}`);
    try {
      await new Promise((resolve, reject) => {
        loader.load(
          url,
          (gltf) => {
            try {
              onVrmLoaded(gltf);
              resolve();
            } catch (e) {
              reject(e);
            }
          },
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
      return; // success
    } catch (err) {
      console.error(`[vrm] failed ${url}:`, err);
      setStatus(
        `avatar load failed: ${err?.message || err} — trying next candidate`,
      );
    }
  }
  setStatus("avatar load failed — all candidates exhausted (see console)");
}

tryLoadVrm(VRM_CANDIDATES);

async function swapPersona(avatarUrl) {
  setStatus(`persona swap: ${avatarUrl}`);
  // Dispose current VRM.
  if (currentVRM) {
    scene.remove(currentVRM.scene);
    if (typeof VRMUtils.deepDispose === "function") {
      try { VRMUtils.deepDispose(currentVRM.scene); } catch (e) { console.warn(e); }
    }
    currentVRM = null;
  }
  await tryLoadVrm([avatarUrl]);
}

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
        await swapPersona(msg.avatarUrl);
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
