# TOOLBOX — companion-spec

セッション開始時に目を通す実装ノート。試行錯誤で掴んだ事実と、その出典を
恒久化するための場所。記述は「何を／なぜ／どう」の順で。

---

## 1. three-vrm（3.x）運用規約

### 1.1 バージョン判定は `vrm.meta.metaVersion`

- `vrm.meta.metaVersion === "0"` → VRM 0.x
- `vrm.meta.metaVersion === "1"` → VRM 1.0
- `specVersion` は glTF 拡張側のフィールドであり `vrm.meta` には乗らない。
  混同しないこと。

出典：`@pixiv/three-vrm-core` 3.1.4 型定義
（`types/meta/VRM0Meta.d.ts`, `VRM1Meta.d.ts`）。

### 1.2 正面方向の正規化は `VRMUtils.rotateVRM0(vrm)` に任せる

- VRM 0.x は `-Z` 向き、VRM 1.0 は `+Z` 向き（仕様の意図的な破壊的変更）。
- `VRMUtils.rotateVRM0(vrm)` は内部で `metaVersion === "0"` のときだけ
  `vrm.scene.rotation.y = Math.PI` を適用する。VRM 1.0 では no-op。
- **だから無条件で呼んでよい**。自前で `rotation.y = Math.PI` を書かない。
  書くと 1.0 モデルが後ろを向く（二重回転）。

出典：
- VRM 1.0 T-pose spec（[vrm-specification/VRMC_vrm-1.0/tpose.md](https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_vrm-1.0/tpose.md)）
- three-vrm migration-guide-1.0（[pixiv.github.io/three-vrm/docs/documents/migration-guide-1.0.html](https://pixiv.github.io/three-vrm/docs/documents/migration-guide-1.0.html)）
- [packages/three-vrm/src/VRMUtils/rotateVRM0.ts](https://github.com/pixiv/three-vrm/blob/dev/packages/three-vrm/src/VRMUtils/rotateVRM0.ts)

### 1.3 ポーズ付与は **normalized humanoid** を使う

- `vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.XxxUpperArm)` を使う。
- `getRawBoneNode` は物理・IK・診断用途に限る。rig ごとに bind 回転が違うので
  普通のアニメーション用途で触ると「モデルごとに符号が違う」地獄に落ちる。
- 正規化ボーンは rest-pose が identity quaternion。つまりローカル軸が
  世界軸と一致する状態から回す。

出典：[three-vrm VRMHumanoid docs](https://pixiv.github.io/three-vrm/docs/classes/three-vrm.VRMHumanoid.html)、
[issue #1585](https://github.com/pixiv/three-vrm/issues/1585)。

### 1.4 A ポーズの符号規約（normalized, three.js 右手系）

- `LeftUpperArm.rotation.z = -0.35` （左腕を体側に降ろす）
- `RightUpperArm.rotation.z = +0.35` （右腕を体側に降ろす）
- 下腕は `±0.10` 程度でわずかに内側／前へ。
- 20° より深い A ポーズ（70°＝約 1.22 rad）は Animaze 規格が採用。浅く使うなら
  20° 前後で充分。

**演繹の根拠**：
1. 正規化ボーンは rest-pose identity ⇒ ローカル軸 = 世界軸。
2. T-pose では左腕は `+X` 方向に伸びる（VRM 1.0 T-pose 仕様）。
3. three.js の正方向回転は右手則。`+Z` 回りに正角度 ⇒ `+X` が `+Y` に回る
   ＝腕が上がる。したがって**下げるには負**。

経験則：もし符号が逆の挙動を見たら、rig のバグかカメラの向きを疑う。
仕様上は上記が正しい。

出典：Kalidokit の実装例、Animaze VRM アニメーション仕様、[T-pose spec](https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_vrm-1.0/tpose.md)。

### 1.5 カメラ・フレーミングは **Head ボーン基準**、`Box3` は使わない

- `Box3.setFromObject(vrm.scene)` はスプリングボーンのコライダー、
  first-person の隠しメッシュ、初フレーム時点でスキン未適用のメッシュ等で
  不安定になる。
- 代わりに `getNormalizedBoneNode(VRMHumanBoneName.Head).getWorldPosition()` で
  頭位置を取り、固定オフセットでカメラを置く。

```ts
const headPos = new THREE.Vector3();
vrm.humanoid.getNormalizedBoneNode(VRMHumanBoneName.Head)
  .getWorldPosition(headPos);
camera.position.set(headPos.x, headPos.y - 0.05, headPos.z + 0.9);
camera.lookAt(headPos.x, headPos.y - 0.10, headPos.z);
```

出典：three-vrm 公式 examples は Box3 を使わず、`camera.position.set(0, 1.0, 5.0)` 
のような固定値＋ lookAt を採用している
（[basic.html](https://pixiv.github.io/three-vrm/packages/three-vrm/examples/)、lookat.html）。

### 1.6 three-vrm 3.x で消えた API（落とし穴）

- `VRMUtils.combineSkeletons` は 3.x で削除された。
- 現存するのは `deepDispose`, `removeUnnecessaryJoints`,
  `removeUnnecessaryVertices`, `rotateVRM0`。
- 呼ぶ前に `typeof VRMUtils.xxx === "function"` で守る。

### 1.7 `VRMLookAt` は `head.quaternion` を毎フレーム上書きする

`vrm.update(dt)` の内部で `VRMLookAt.update()` が呼ばれ、
`lookAt.autoUpdate === true` のときは **head ボーンの quaternion を直接
書き換える**。したがって idle アニメで `head.rotation.x/y/z` に代入しても、
その直後の `vrm.update()` で消える。

対策：
1. **首を揺らしたいなら `Neck` を回す**。公式 examples の `bones.html`
   （v3.1.4）も neck を操作している。
2. ターゲットを外す：`vrm.lookAt.target = null;`
3. 自動更新を止める：`vrm.lookAt.autoUpdate = false;`

1＋2＋3 を併用しておくのが無難。target 未設定でも autoUpdate が true のままだと
quaternion 初期化が走る rig がある。

出典：
- [three-vrm examples bones.html](https://github.com/pixiv/three-vrm/blob/dev/packages/three-vrm/examples/bones.html)
- [VRMLookAt API](https://pixiv.github.io/three-vrm/docs/classes/three-vrm.VRMLookAt.html)

### 1.8 Normalized `Hips.position.y` は rest 値が **モデル依存**

- 正規化ボーンは **回転** が identity quaternion に揃うだけで、
  **位置** は rest-pose の値（キャラクターの腰の高さ、典型的に 0.8〜1.0m）
  がそのまま乗っている。ゼロではない。
- したがって idle 用の breathing で `hips.position.y = sin(t) * 0.02` と
  **絶対代入**すると rest 高さが消えて足元が床にめり込む。
- 正しくは加算：`hips.position.y = restHipY + sin(t) * 0.02;`
  restHipY はロード直後に保存しておくこと。
  それも面倒なら、呼吸は `Spine` の微小回転で表現するのが安全。

出典：[pixiv/three-vrm Issue #1585](https://github.com/pixiv/three-vrm/issues/1585)
（normalized humanoid の position 非ゼロに関するスレッド）。

### 1.9 アバターのホットスワップは「インフライト mutex ＋ URL 重複排除」で

**問題**：サーバーが WebSocket 接続時に `{ type: "persona", avatarUrl }` を
送信し、クライアントが起動時にも初期アバターをロードすると、
**同じ URL に対して GLTFLoader を二重に走らせる**ことがある。
`three.js` は `THREE.Cache.enabled` がデフォルト `false` なので、
同じ URL でも毎回フェッチし直す（[three.js #15321](https://github.com/mrdoob/three.js/issues/15321)）。

**対策パターン**：

```js
let currentVRM = null;
let currentAvatarUrl = null;
let avatarLoadingPromise = null;

async function loadAvatar(urlOrCandidates) {
  const candidates = Array.isArray(urlOrCandidates) ? urlOrCandidates : [urlOrCandidates];
  // 1) 既に同じ URL が乗っているなら何もしない
  if (currentVRM && candidates.includes(currentAvatarUrl)) return;
  // 2) 進行中のロードがあるなら待つ
  if (avatarLoadingPromise) {
    await avatarLoadingPromise;
    if (currentVRM && candidates.includes(currentAvatarUrl)) return;
  }
  avatarLoadingPromise = (async () => {
    if (currentVRM) {
      scene.remove(currentVRM.scene);
      if (typeof VRMUtils.deepDispose === "function") VRMUtils.deepDispose(currentVRM.scene);
      currentVRM = null;
      currentAvatarUrl = null;
    }
    for (const url of candidates) {
      try {
        const gltf = await loadVrmFromUrl(url);
        onVrmLoaded(gltf);
        currentAvatarUrl = url;
        return;
      } catch (err) { /* 次候補へ */ }
    }
  })();
  try { await avatarLoadingPromise; } finally { avatarLoadingPromise = null; }
}
```

出典：
- [pixiv/three-vrm Discussion #1172](https://github.com/pixiv/three-vrm/discussions/1172)
  （ホットスワップ時のメモリとレース条件）
- [three.js Issue #15321](https://github.com/mrdoob/three.js/issues/15321)
  （`THREE.Cache` はデフォルト無効、明示的に `THREE.Cache.enabled = true` が必要）

---

## 2. カメラ／姿勢の実装テンプレート

VRM を読み込むたびに以下の順序で処理する：

```ts
scene.add(vrm.scene);
VRMUtils.rotateVRM0(vrm);            // 0.x を +Z 向きに揃える（1.0 は no-op）
applyAPose(vrm);                     // normalized bones で符号規約どおりに
vrm.update(0);                       // normalized → raw をフラッシュ
frameCameraOnHead(vrm);              // Head bone 基準で配置
applyEmotion("calm");
setStatus("ready");
```

Idle アニメは毎フレーム `normalizedHumanBones.xxx.node.rotation` を上書き＋
`vrm.update(dt)` を呼ぶ。raw 側は三-vrm が自動同期する。

---

## 3. VOICEVOX 運用

- デフォルト話者は `8`（春日部つむぎ ノーマル）。
- `.companion` バンドルで `voice.speaker` が指定されたら優先。
- VOICEVOX が落ちていたら MCP 側でエラーを上流に返す（スタブ音声は出さない）。

---

## 4. 開発サイクル

- コードを触る前に該当箇所の ADR／このファイルを読む。「何を調べたか」を
  まず確認する。
- 試行錯誤で何かを発見したら、**その場で**この TOOLBOX に追記する。
- 出典 URL は必須。「たぶんこう」は書かない。検証できないものは
  「演繹（根拠 A／B／C）」と明記する。

### 4.1 TDZ（一時的デッドゾーン）注意

モジュール初期化時に即時実行する関数（例：`resize()`）が `let` / `const`
宣言された変数を参照するなら、**その宣言を関数より前に書く**。
`let currentVRM = null;` を `resize()` の定義より下に置いて `resize()` を
即時呼ぶと、`ReferenceError: Cannot access 'currentVRM' before initialization`
でモジュール全体が死ぬ（`main.js` は一行も動かず、ステータスは HTML 初期値
の "loading..." のまま固まる）。

出典：
- MDN, _Temporal dead zone_ — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let#temporal_dead_zone_tdz

---

## 5. 参考リンク集

- [@pixiv/three-vrm](https://github.com/pixiv/three-vrm)
- [VRM specification (1.0)](https://github.com/vrm-c/vrm-specification)
- [three-vrm migration guide 1.0](https://pixiv.github.io/three-vrm/docs/documents/migration-guide-1.0.html)
- [three-vrm examples](https://pixiv.github.io/three-vrm/packages/three-vrm/examples/)
- [VOICEVOX engine API](https://voicevox.github.io/voicevox_engine/api/)
- [VRM 0.x → 1.0 facing change (issue #2151)](https://github.com/vrm-c/UniVRM/issues/2151)
