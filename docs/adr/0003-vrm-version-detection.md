# ADR-0003：VRM バージョン判定は `metaVersion` 一本で行う

- 状態：採択（2026-04-18）
- 文脈：companion-spec のランナー全域

## 決定

- バージョン判定は `vrm.meta?.metaVersion === "0" | "1"` のみ使う。
- 正面方向の補正は自前で `rotation.y = Math.PI` を書かず、
  `VRMUtils.rotateVRM0(vrm)` を無条件で呼ぶ（1.0 では no-op）。

## 根拠

- `specVersion` は glTF 拡張側のフィールドで `vrm.meta` には乗らない。
  three-vrm の型定義で別物。混同しない。
- `rotateVRM0` は内部で `metaVersion === "0"` のときだけ適用される安全関数。
  自前分岐より壊れにくく、意図が読みやすい。

## 参考

- `@pixiv/three-vrm-core` 3.1.4 型定義（`types/meta/*.d.ts`）
- [packages/three-vrm/src/VRMUtils/rotateVRM0.ts](https://github.com/pixiv/three-vrm/blob/dev/packages/three-vrm/src/VRMUtils/rotateVRM0.ts)
- [migration-guide-1.0](https://pixiv.github.io/three-vrm/docs/documents/migration-guide-1.0.html)
