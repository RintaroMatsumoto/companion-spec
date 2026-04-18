# ADR-0001：three-vrm の姿勢操作は normalized humanoid に統一する

- 状態：採択（2026-04-18）
- 文脈：companion-spec のランナー（prototypes/companion-desktop）

## 背景

VRM アバターに A ポーズと idle 微動（呼吸・微揺れ）を付ける際、当初は
`getRawBoneNode` で直接ボーンを回していた。結果、モデルごとに符号が
逆転したり、万歳ポーズになったり、背中向きになったりした。原因は rig の
bind 回転がモデルごとに異なるため、raw ボーンを触ると「どの軸を回せば
腕が下がるか」がモデル依存になっていた。

## 決定

1. ポーズ・idle アニメの全ボーン操作は
   `vrm.humanoid.getNormalizedBoneNode(...)` を通す。
2. raw ボーンの操作は IK・物理・診断用途に限定する。
3. 符号規約（three.js 右手系、normalized、T-pose で左腕 +X）：
   - `LeftUpperArm.rotation.z` **正**で上（万歳）方向、**負**で下（体側）方向。
   - 右腕はその鏡像で符号反転。
4. 初期 A ポーズ値は `±0.35 rad`（約 20°）を既定。Animaze 互換の深い
   A ポーズが必要な場合は `±1.22 rad`（70°）まで許容。

## 結果

- どの VRM を読み込んでも同じ姿勢コードで同じ見た目になる。
- モデル差はスケール（身長）とプロポーションだけになり、カメラ自動
  フレーミングと組み合わせれば統一的にハンドリングできる。

## 参考

- [three-vrm VRMHumanoid docs](https://pixiv.github.io/three-vrm/docs/classes/three-vrm.VRMHumanoid.html)
- [VRM 1.0 T-pose spec](https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_vrm-1.0/tpose.md)
- [migration-guide-1.0](https://pixiv.github.io/three-vrm/docs/documents/migration-guide-1.0.html)
