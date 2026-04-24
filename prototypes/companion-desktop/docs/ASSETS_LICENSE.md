# Assets license — companion-desktop

プロトタイプ `companion-desktop` に同梱するアセットのライセンス記録。
Phase 4-0 の学習用アーティファクトとしての性格は変わらないが、
バイナリを commit するのでライセンスの出所を明示しておく。

---

## 採用アバター — `avatars/companion.vrm`

| 項目 | 値 |
|------|----|
| モデル名 | **Lydia**（Avatar 054） |
| シリーズ | 100Avatars R1（001–100） |
| 作者 | Polygonal Mind |
| 配布元レジストリ | [ToxSam/open-source-avatars](https://github.com/ToxSam/open-source-avatars) |
| 配布元 (Arweave) | `https://arweave.net/x48D7v037irPQYG7e0vZLDV1E3x5-KookbP9-vaXvYE` |
| サムネ | `https://arweave.net/DgPsMxXBXBxREc7Wq_w-L0Z2MFiM9E7T5s0yV0c4PJg` |
| ライセンス | **CC0 1.0 Universal**（VRM 内 meta.licenseName = `CC0`、`projects.json` の license = `CC0`） |
| VRM バージョン | 0.x（`extensions.VRM`） |
| ファイルサイズ | 1,507,976 bytes（約 1.5 MB） |

### 採用理由

- **CC0 が明示**：VRM の埋め込み meta と、レジストリの両方で `CC0` と一貫して記載されている。二次利用・改変・商用・再配布すべて可。
- **軽量**：1.5 MB と候補 3 体の中で最小、commit しても repo が膨れない。
- **humanoid bones 完備**：Spine / Chest / UpperChest / Neck / Head / Hips / 四肢・指骨すべて揃う。
- **名前の温度感**：Rose / Jennifer と比べて「Lydia」は最も落ち着いた響きで、
  プロトタイプの落ち着いた知的なペルソナに寄せやすい。

### 既知の制約（重要）

**感情 blendshape が VRM に含まれていない。** Polygonal Mind の 100Avatars R1
シリーズ共通の仕様として、表情プリセットは以下しか定義されていない:

```
aa, ih, ou, ee, oh, blink
```

`main.js` が期待する感情プリセット `happy / angry / sad / relaxed / surprised / neutral`
は **すべて欠損**。three-vrm の `expressionManager.setValue("happy", 0.5)`
は未定義プリセットに対してはサイレントに no-op になるため、ビルドや
ランタイムは壊れないが、**感情タグ（calm / wry / pleased / scolding）による
表情変化は事実上機能しない**。口パク（aa）と瞬き（blink）は動く。

対処方針（いずれか）:
1. 暫定（今 PR の立場）: 感情は胴体・腕のジェスチャ側で表現し、
   表情差分は後続タスクに切り出す。
2. 本格対応: Blender で blendshape を追加し VRM を再エクスポート。
3. 別の CC0 モデルで感情 blendshape 完備のものを再調達。

---

## 不採用候補

### Rose（Avatar 057, 100Avatars R1）

- 作者: Polygonal Mind / ライセンス: CC0（VRM meta 明示）
- 配布元: `https://arweave.net/Ea1KXujzJatQgCFSMzGOzp_UtHqB1pyia--U3AtkMAY`
- サイズ: 2,400,964 bytes（約 2.4 MB）
- humanoid bones 完備、ただし**感情 blendshape は Lydia と同じく欠損**。
- 不採用理由: 名前の温度感が「可愛い寄り」で、知的で落ち着いた路線からはやや逸れる。
  スタイル・ライセンスは Lydia と同等。候補として記録しておく。

### Jennifer（Avatar 052, 100Avatars R1）

- 作者: Polygonal Mind / ライセンス: CC0（VRM meta 明示）
- 配布元: `https://arweave.net/LKp1uJLAZFmncdCNSZ8oopU7ZElXTvn4BmM4CUcFclc`
- サイズ: 2,124,360 bytes（約 2.1 MB）
- humanoid bones 完備、**感情 blendshape は Lydia と同じく欠損**。
- 不採用理由: 名前は中立だがスタイルは 3 体で大差なく、Lydia より
  ファイルサイズが大きい。

### Xmas Chibi — Elel Silverbell（検証のみ）

- 作者: VIPE / レジストリ記載ライセンス: CC0
- **ただし VRM 本体の meta.licenseName = `Redistribution_Prohibited`** という
  重大な矛盾を検出。再配布を禁止している可能性が高いため即却下。
- 感情 blendshape（happy / angry / sad / relaxed / neutral）は揃っていたが、
  ライセンスが信頼できない以上 commit 不可。
- 教訓: レジストリのライセンス表記を鵜呑みにせず、必ず VRM meta と
  突き合わせる。`scripts/inspect-vrm.mjs` でチェックできるようにした。

---

## 旧 placeholder の扱い

`avatars/companion.vrm` にはこれまで three-vrm の
`VRM1_Constraint_Twist_Sample.vrm`（pixiv Inc., 2022）が置かれていた。
これは three-vrm リポジトリのサンプルで、`scripts/download-avatar.mjs`
が取得していた。本タスクで Lydia に置換。サンプルはコードベースから
参照を消していない（ダウンロードスクリプトは残す判断。自作 VRM を
入れる場合のフォールバックとして）。

---

## ツール

- `scripts/inspect-vrm.mjs` — VRM の GLB JSON チャンクをダンプし、
  ライセンスメタ・humanoid bones・expression プリセットの過不足を
  レポートする。新しい候補を検討する際はまずこれに通す。

```bat
node scripts/inspect-vrm.mjs avatars/candidates/*.vrm
```
