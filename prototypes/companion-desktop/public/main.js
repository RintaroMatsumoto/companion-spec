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
import {
  VRMAnimationLoaderPlugin,
  createVRMAnimationClip,
} from "@pixiv/three-vrm-animation";

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
// Register BOTH VRM and VRMA loader plugins on the same GLTFLoader.
// Per three-vrm-animation examples, the plugin reads the VRMC_vrm_animation
// glTF extension and attaches `gltf.userData.vrmAnimations` to the result.
// Source: https://pixiv.github.io/three-vrm/packages/three-vrm-animation/examples/
loader.register((parser) => new VRMLoaderPlugin(parser));
loader.register((parser) => new VRMAnimationLoaderPlugin(parser));

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

// Rest (A-pose) hips position. Captured at onVrmLoaded time so updateIdle
// can additively drive hips.position.x without clobbering the authored y.
// VRM の作家が設定した高さ（通常 y≈0.9）を崩さない。
let hipsRestPos = null;

// ---- Camera dolly state (FOV easing) ----
// 実行中のドリーがなければ null。`tick()` で補間する。
let dollyState = null; // { startMs, durationMs, fromFov, toFov }

// ---- Stepping (足踏み) state ----
// 実行中の足踏みがなければ null。
let stepState = null; // { startMs, totalSteps, durationMs }

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
  // Rebuild the AnimationMixer against the new VRM's skeleton. Clips built
  // against the old VRM must not cross over.
  rebindDanceMixer(vrm);

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

  // Capture rest hips position BEFORE the first updateIdle() mutates it.
  // updateIdle() writes hips.position.x each frame; we need the authored value
  // as the baseline. y / z are never touched (keeps rest height intact).
  const restHips = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.Hips);
  if (restHips) {
    hipsRestPos = {
      x: restHips.position.x,
      y: restHips.position.y,
      z: restHips.position.z,
    };
  } else {
    hipsRestPos = null;
  }
  // Any in-flight dolly/step sessions from a prior avatar are stale now.
  dollyState = null;
  stepState = null;
  camera.fov = CAM_FOV_FAR;
  camera.updateProjectionMatrix();

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

// ---- Locomotion / weight shift constants ----
// 重心スイング：4 秒周期（= 0.25 Hz）、振幅 ±0.02 m。
// 480x720 窓内で目立ちすぎない、でも「生きてる」と分かる量として調整。
// 数値の根拠：肩幅 ~0.3 m の VRM アバターで、0.02 m は肩幅の約 6.7%。
// 人の自然な待機時の体重移動とほぼ同じレンジ（5〜10%）。
const WEIGHT_SHIFT_HZ = 0.25;
const WEIGHT_SHIFT_AMP_M = 0.02;

// カメラドリー（FOV ベース）：小窓で「寄る／退く」を表現する。
// アバターを前後に動かすより、FOV を絞る方が：
//   - 足元が画面外に出ない（480x720 で頭〜腰を映す構図を維持）
//   - 背景が動かないので画面酔いしにくい
//   - 実装が軽い（カメラ位置の再計算が不要）
const CAM_FOV_FAR = 30;   // デフォルト（onload 時の camera.fov と一致）
const CAM_FOV_NEAR = 26;  // approach 時
const CAM_FOV_EASE_MS = 800;

// 足踏み：1 歩 300ms、既定 2 歩（計 600ms）+ 軽い振り戻し。
const STEP_DURATION_MS = 300;
const STEP_DEFAULT_COUNT = 2;
// UpperLeg.rotation.x は「腿を前後に振る」軸。
// 正 = 後ろに蹴る（VRM の rest で foot が前、hip が後ろ向き座標なので実測で調整）。
// 実測：+0.18 rad (~10°) で「膝上げ」として視認できる。控えめに ±0.18 rad。
const STEP_HIP_AMP = 0.18;
// 蹴った側の膝を曲げる（= 足を上げる）。+0.35 rad (~20°) 程度。
const STEP_KNEE_AMP = 0.35;

function updateIdle(vrm, now) {
  if (!vrm?.humanoid) return;
  // Short-circuit when VRMA dance dominates: the mixer will overwrite the
  // humanoid bones absolutely, and any partial crossfade is handled by
  // three's AnimationAction.weight lerping from the "current binding value"
  // (which is whatever updateIdle last wrote — see the render loop order)
  // toward the clip value. So we only need to stop writing idle when
  // dance is ~fully asserted.
  if (danceWeight >= 0.98) return;
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

  // 重心：左右荷重移動。回転＋位置を加算する（「その場体重移動」）。
  // NOTE: hips.position.y を絶対値で書くと rest pose の高さ（~0.9m）を上書きして
  //       アバター全体が床にめり込む。呼吸感は脊柱・胸・肩の回転で既に十分出る。
  // 重心スイングは 4 秒周期（0.25 Hz）、振幅 ±0.02 m。480x720 小窓で過剰に動かない量。
  const hips = h.getNormalizedBoneNode(VRMHumanBoneName.Hips);
  const weightShift = Math.sin(t * WEIGHT_SHIFT_HZ * TAU); // -1..+1、右荷重=正
  if (hips) {
    hips.rotation.z = Math.sin(t * 0.27)       * 0.07;      // ±4° 傾き
    hips.rotation.y = Math.sin(t * 0.21 + 0.3) * 0.08;      // ±4.6° ひねり
    // rest hips.position は VRM 側の値が入っている（通常 y≈0.9）。x 成分だけ
    // 乗せて左右に振る。z は触らない（前後に歩き回らない）。
    if (hipsRestPos) {
      hips.position.x = hipsRestPos.x + weightShift * WEIGHT_SHIFT_AMP_M;
    }
  }

  // 膝：体重が乗った側を微小に曲げる（反対側は伸ばす）。
  // rotation.x 正 = 膝を曲げる（すねが前に出る）。VRM 標準。
  // 足踏み中は別レイヤーが乗るので、ここでは弱め（±0.05 rad = ±2.9°）。
  // NOTE: 足踏み中は stepping レイヤーが直後に完全上書きする（updateStepping）。
  const lLowLeg = h.getNormalizedBoneNode(VRMHumanBoneName.LeftLowerLeg);
  const rLowLeg = h.getNormalizedBoneNode(VRMHumanBoneName.RightLowerLeg);
  // weightShift > 0 → 右荷重 → 右膝を軽く曲げ、左は伸ばす
  if (lLowLeg) lLowLeg.rotation.x = Math.max(0, -weightShift) * 0.05;
  if (rLowLeg) rLowLeg.rotation.x = Math.max(0,  weightShift) * 0.05;

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

// ---------------- Stepping (足踏み) layer ----------------
// 既存の idle レイヤーが書いた UpperLeg / LowerLeg の rotation.x を
// 足踏み中のみ「上書き」する（加算ではない）。終了時は idle が書き戻す。
// hips.position.z は触らない（その場足踏み、歩き回らない）。
function updateStepping(vrm, now) {
  if (!stepState || !vrm?.humanoid) return;
  const h = vrm.humanoid;
  const elapsed = now - stepState.startMs;
  if (elapsed >= stepState.durationMs) {
    // 終了：idle レイヤーが次フレームから rotation.x を書き戻す。
    stepState = null;
    return;
  }

  // どのステップの中か、その中の進捗（0..1）か。
  const stepIdx = Math.floor(elapsed / STEP_DURATION_MS); // 0, 1, 2, ...
  const phase = (elapsed % STEP_DURATION_MS) / STEP_DURATION_MS; // 0..1
  // sin(πφ) で滑らかな「上げ→下ろす」山型。端で 0 になるので継ぎ目も自然。
  const lift = Math.sin(phase * Math.PI);
  // 偶数ステップ=右足、奇数ステップ=左足を上げる。
  const liftingRight = (stepIdx % 2) === 0;

  const lUp = h.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperLeg);
  const rUp = h.getNormalizedBoneNode(VRMHumanBoneName.RightUpperLeg);
  const lLow = h.getNormalizedBoneNode(VRMHumanBoneName.LeftLowerLeg);
  const rLow = h.getNormalizedBoneNode(VRMHumanBoneName.RightLowerLeg);

  // 上げ足：腿を前に振る（rotation.x 負で前、VRM 右手系）＋膝曲げ。
  // 支持足：0 に戻す（idle の微小曲げを上書き）。
  if (liftingRight) {
    if (rUp)  rUp.rotation.x  = -STEP_HIP_AMP  * lift;
    if (rLow) rLow.rotation.x =  STEP_KNEE_AMP * lift;
    if (lUp)  lUp.rotation.x  = 0;
    if (lLow) lLow.rotation.x = 0;
  } else {
    if (lUp)  lUp.rotation.x  = -STEP_HIP_AMP  * lift;
    if (lLow) lLow.rotation.x =  STEP_KNEE_AMP * lift;
    if (rUp)  rUp.rotation.x  = 0;
    if (rLow) rLow.rotation.x = 0;
  }
}

// ---------------- Camera dolly (FOV easing) ----------------
// approach / retreat で FOV を補間する。アバターは動かさず、
// カメラ側を「寄る・退く」で表現する（UX 方針）。
function updateDolly(now) {
  if (!dollyState) return;
  const { startMs, durationMs, fromFov, toFov } = dollyState;
  const raw = Math.min(1, (now - startMs) / durationMs);
  // easeInOutQuad
  const k = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
  camera.fov = fromFov + (toFov - fromFov) * k;
  camera.updateProjectionMatrix();
  if (raw >= 1) dollyState = null;
}

function startDolly(toFov, durationMs = CAM_FOV_EASE_MS) {
  dollyState = {
    startMs: performance.now(),
    durationMs,
    fromFov: camera.fov,
    toFov,
  };
}

function startStepping(count) {
  const n = Math.max(1, Math.min(8, Math.floor(count || STEP_DEFAULT_COUNT)));
  stepState = {
    startMs: performance.now(),
    totalSteps: n,
    durationMs: n * STEP_DURATION_MS,
  };
}

// WS `move` ハンドラ。明示トリガのみ（自動発火なし）。
function handleMove(action, opts = {}) {
  switch (action) {
    case "approach":
      startDolly(CAM_FOV_NEAR);
      break;
    case "retreat":
      startDolly(CAM_FOV_FAR);
      break;
    case "step":
      startStepping(opts.steps);
      break;
    default:
      console.warn("[move] unknown action:", action);
  }
}

// ---------------- VRMA dance layer ----------------
// Design:
//   - A single VRMA clip drives an AnimationMixer rebound whenever the VRM
//     avatar changes (VRM swap → rebuild clip + mixer).
//   - Layer mixing: a scalar `danceWeight` in [0,1] crossfades between the
//     procedural idle pose (weight = 1 - danceWeight) and the VRMA clip
//     output. The "idle off" is achieved by attenuating the delta we write
//     to normalized bones in updateIdle(); the VRMA mixer is allowed to
//     write the humanoid bones directly when danceWeight > 0.
//   - VRM expression (emotion) channels are NOT touched by the VRMA clip
//     unless the clip itself animates expressions; in practice the tk256
//     VRMA set only animates the humanoid bones so emotion stays locked.
//
// References:
//   - https://www.npmjs.com/package/@pixiv/three-vrm-animation
//   - https://pixiv.github.io/three-vrm/packages/three-vrm-animation/examples/

// Clip registry: short key → VRMA URL (server file). Keep in sync with the
// server-side whitelist in server/index.js.
const DANCE_CLIPS = {
  clap:     "/avatars/motions/Clapping.vrma",
  jump:     "/avatars/motions/Jump.vrma",
  look:     "/avatars/motions/LookAround.vrma",
  thinking: "/avatars/motions/Thinking.vrma",
};

// Pre-loaded VRMAnimation objects, keyed by clip name. Populated at boot.
const vrmAnimationCache = Object.create(null);
let vrmaPreloadPromise = null;

async function preloadVRMAs() {
  if (vrmaPreloadPromise) return vrmaPreloadPromise;
  vrmaPreloadPromise = (async () => {
    const entries = Object.entries(DANCE_CLIPS);
    await Promise.all(entries.map(async ([name, url]) => {
      try {
        const gltf = await new Promise((res, rej) => {
          loader.load(url, res, undefined, rej);
        });
        const anims = gltf.userData.vrmAnimations;
        if (!anims || !anims.length) {
          console.warn(`[vrma] ${url} has no vrmAnimations — skipping`);
          return;
        }
        vrmAnimationCache[name] = anims[0];
        console.log(`[vrma] preloaded "${name}" from ${url}`);
      } catch (err) {
        console.warn(`[vrma] failed to preload "${name}" (${url}):`, err);
      }
    }));
  })();
  return vrmaPreloadPromise;
}

// Per-VRM mixer + active action bookkeeping. Rebuilt in rebindDanceMixer().
let mixer = null;
let activeDanceAction = null;
let activeDanceName = null;

// Layer weight: 0 = pure idle, 1 = pure VRMA.
// Updated by fades in startDance() / stopDance() each frame.
let danceWeight = 0;
let danceWeightTarget = 0;
const DANCE_FADE_SECONDS = 0.35;

function rebindDanceMixer(vrm) {
  // Stop & dispose prior mixer (actions retain references to the old VRM).
  if (mixer) {
    mixer.stopAllAction();
    mixer.uncacheRoot(mixer.getRoot?.() ?? undefined);
    mixer = null;
  }
  activeDanceAction = null;
  activeDanceName = null;
  danceWeight = 0;
  danceWeightTarget = 0;
  if (!vrm) return;
  mixer = new THREE.AnimationMixer(vrm.scene);
}

function startDance(clipName) {
  if (!currentVRM || !mixer) {
    console.warn("[dance] no VRM/mixer yet, ignoring", clipName);
    return false;
  }
  const vrma = vrmAnimationCache[clipName];
  if (!vrma) {
    console.warn(`[dance] unknown clip "${clipName}"`);
    return false;
  }

  // Build a fresh THREE.AnimationClip bound to THIS vrm's skeleton.
  // createVRMAnimationClip must be called per (vrma, vrm) pair.
  let clip;
  try {
    clip = createVRMAnimationClip(vrma, currentVRM);
  } catch (err) {
    console.error(`[dance] createVRMAnimationClip failed for ${clipName}:`, err);
    return false;
  }

  // Stop previous dance immediately (no in-dance crossfade for v0).
  if (activeDanceAction) {
    activeDanceAction.stop();
    activeDanceAction = null;
  }

  const action = mixer.clipAction(clip);
  action.setLoop(THREE.LoopOnce, 1);
  action.clampWhenFinished = false;
  action.reset().play();

  activeDanceAction = action;
  activeDanceName = clipName;
  danceWeightTarget = 1;

  // Auto-release back to idle when the clip finishes. The mixer fires
  // "finished" for LoopOnce actions.
  const onFinished = (ev) => {
    if (ev.action !== action) return;
    mixer.removeEventListener("finished", onFinished);
    stopDance();
  };
  mixer.addEventListener("finished", onFinished);

  setStatus(`dance: ${clipName}`);
  return true;
}

function stopDance() {
  danceWeightTarget = 0;
  // Action is stopped once the fade reaches 0 — see updateDance().
}

function updateDance(dt) {
  if (!mixer) return;

  // Ease danceWeight toward target.
  if (danceWeight !== danceWeightTarget) {
    const step = dt / DANCE_FADE_SECONDS;
    if (danceWeight < danceWeightTarget) {
      danceWeight = Math.min(danceWeightTarget, danceWeight + step);
    } else {
      danceWeight = Math.max(danceWeightTarget, danceWeight - step);
    }
  }

  // Apply weight to the action (AnimationMixer honors action.weight when
  // blending). Fully stop when weight reaches zero so we don't keep a dead
  // action on the mixer.
  if (activeDanceAction) {
    activeDanceAction.weight = danceWeight;
    if (danceWeight <= 0.001 && danceWeightTarget <= 0) {
      activeDanceAction.stop();
      activeDanceAction = null;
      activeDanceName = null;
      setStatus("ready");
    }
  }

  // Advance the mixer (no-op if no actions).
  mixer.update(dt);
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
// Preload VRMA dance clips in parallel — first /dance message arrives after
// this settles in practice (avatar load is the long pole at ~1–3 MB).
preloadVRMAs();

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
    // Stepping layer は idle の後で走る（脚の rotation.x を上書きする）。
    updateStepping(currentVRM, now);
    // Dance mixer runs AFTER updateIdle so three's AnimationAction.weight
    // lerps from the idle-written pose toward the VRMA clip values. During
    // crossfade this produces a smooth blend; at weight=1 the mixer fully
    // overrides. See the VRMA dance layer section above.
    updateDance(dt);
    currentVRM.update(dt);
  }

  // Camera dolly は VRM の update とは独立。FOV のみ補間する。
  updateDolly(now);

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
    } else if (msg.type === "move" && typeof msg.action === "string") {
      try {
        handleMove(msg.action, { steps: msg.steps });
      } catch (err) {
        console.error("move failed", err);
      }
    } else if (msg.type === "dance" && typeof msg.clip === "string") {
      // Ensure VRMAs have finished loading before trying to play. If the
      // first dance arrives during preload, wait for it.
      try {
        await preloadVRMAs();
        startDance(msg.clip);
      } catch (err) {
        console.error("dance start failed", err);
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
