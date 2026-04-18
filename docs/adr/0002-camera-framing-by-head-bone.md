# ADR-0002：カメラ・フレーミングは Head ボーン基準で行う

- 状態：採択（2026-04-18）
- 文脈：companion-spec のランナー（prototypes/companion-desktop）

## 背景

VRM のスケール・原点規約がモデルごとに揺れる。固定値の
`camera.position.set(0, 1.3, 2.2); camera.lookAt(0, 1.2, 0)` では
短いアバターが画面下端に沈み、背の高いアバターが頭を切られる。

`Box3.setFromObject(vrm.scene)` による自動フィットも試したが、
スプリングボーンのコライダーや first-person の隠しメッシュ、初フレーム
時点のスキン未更新のせいで境界箱が膨張／縮小する。実際、three-vrm 公式
examples はいずれも Box3 を採用していない。

## 決定

- カメラは Head ボーンの **world position** を基準に配置する：
  ```
  camera.position = headPos + (0, -0.05, +0.9)
  camera.lookAt(headPos + (0, -0.10, 0))
  ```
- ウィンドウリサイズ時にも同じ関数を呼んで再フレーミングする。
- FOV は 30° を既定（胸から上をちょうど収める画角）。

## 根拠

- 公式 examples が採用する idiom と整合する。
- Head ボーンはどの VRM にも存在する必須ボーン（humanoid spec）。
- 結果がモデルのメッシュ構成に依存しないため、スプリングボーン等の
  副作用を受けない。

## 参考

- [three-vrm examples（basic.html / lookat.html）](https://pixiv.github.io/three-vrm/packages/three-vrm/examples/)
- [VRM Humanoid 必須ボーン一覧](https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_vrm-1.0/humanoid.md)
