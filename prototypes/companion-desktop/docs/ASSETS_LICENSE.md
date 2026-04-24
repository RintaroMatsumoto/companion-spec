# Assets license — companion-desktop

プロトタイプ `companion-desktop` に同梱するアセットのライセンス記録。
Phase 4-0 の学習用アーティファクトとしての性格は変わらないが、
バイナリを commit するのでライセンスの出所を明示しておく。

---

## 採用アバター — `avatars/companion.vrm`

| 項目 | 値 |
|------|----|
| モデル名 | **Sendagaya Shibu**（β Ver AvatarSample_1） |
| 作者 | pixiv Inc.（VRoid Studio 公式サンプル） |
| 配布元レジストリ | [madjin/vrm-samples](https://github.com/madjin/vrm-samples) — `vroid/beta/Sendagaya_Shibu.vrm` |
| 上流オリジナル | [VRoid Studio β Ver AvatarSample_1 公式 FAQ](https://vroid.pixiv.help/hc/en-us/articles/360012381793-%CE%B2-Ver-AvatarSample-1) |
| VRoid Hub | https://hub.vroid.com/characters/675572020956181239/models/4479743608263344465 |
| ライセンス | **CC0 1.0 Universal**（VRM 内 `meta.licenseName = "CC0"`、VRoid 公式 FAQ で CC0 と明記） |
| 利用条件（VRM meta） | allowedUserName = Everyone / commercialUssageName = Allow / violentUssageName = Allow / sexualUssageName = Allow |
| VRM バージョン | 0.x（`extensions.VRM`） |
| ファイルサイズ | 17,049,284 bytes（約 16.3 MB） |
| キャラ設定 | 高校1年生、ボブヘアに P 字のヘアピン。VRoid Studio メインビジュアルのサンプルモデル。 |

### 採用理由

- **CC0 が二重に明示**：VRM 内埋め込み meta と、配布元 pixiv Inc. の公式 FAQ の両方で CC0 1.0 と一貫して記載されている。商用・改変・再配布・派生作品すべて可、帰属表示不要。
- **感情 blendshape 完全搭載**：VRoid Studio 公式エクスポートなので、`happy / angry / sad / relaxed / neutral / blink / aa / ih / ou / ee / oh` と `blink_l / blink_r` がすべて揃う。companion-desktop の emotion マッピング（calm / wry / pleased / scolding）が正しく表情に反映される。
- **humanoid bones 完備**：54 本（指骨・爪先・目まで含む）が過不足なく揃う。ジェスチャ実装に必要な upperChest / shoulders / fingers すべて搭載。
- **VRoid 由来**：Polygonal Mind 系ではなく VRoid Studio のネイティブエクスポート。VRM 規格の表情・ボーンを素直に持つ。
- **10代少女・知的で落ち着いた印象**：高校1年生設定、派手すぎない制服、ボブヘア。プロトタイプのペルソナ「可愛く知的で落ち着いた」に合致。
- **上流が堅牢**：pixiv Inc. が公式に CC0 で配布している VRoid Studio のメインビジュアルモデル。ライセンス矛盾のリスクが極小。

### blendshape 検証結果

`scripts/inspect-vrm.mjs avatars/companion.vrm` の出力サマリ:

```
humanoidBones: 54 present, 0 missing
expressions: [aa, angry, blink, blink_l, blink_r, ee, happy, ih, neutral, oh, ou, relaxed, sad, unknown]
  missing: [surprised]
```

- `main.js` の感情マッピングが使う `happy / angry / relaxed / neutral`：**すべて PASS**。
- 口パク `aa`・瞬き `blink`：**PASS**。
- 母音 `ih / ou / ee / oh`：PASS（将来の子音口形拡張にも対応可）。
- 追加の `sad` プリセットも利用可。
- `surprised` のみ未搭載だが、現在の main.js は呼び出さないため運用上問題なし（必要になったら `happy` + 眉上げなどで代替可）。

### 既知の制約

- ファイルサイズが 16.3 MB あり、当初の「5 MB 以下が理想」からは外れる。ただし blendshape 完全搭載の CC0 VRoid 系モデルは総じてこのサイズ帯。Lydia（1.5 MB）は極端に小さかったが表情欠損があったため、サイズよりも **表情の可動** を優先した。
- VRM 0.x 形式。three-vrm は 0.x / 1.0 どちらも読むので実行互換性の問題はない。

---

## 候補比較（今回検証した 3 体）

いずれも VRoid Studio 公式サンプル、`meta.licenseName = "CC0"`、humanoid 54 bones 完備、表情 `happy/angry/sad/relaxed/neutral/blink` + 母音 5 種 が揃う。違いはキャラデザインとサイズ。

| # | モデル名（FAQ 名） | サイズ | キャラ | 採否 |
|---|------|-------|-------|------|
| 1 | **Sendagaya Shibu**（β Ver AvatarSample_1） | 17.0 MB | 高校1年生・ボブ・P ヘアピン・知的で素直 | **採用** |
| 2 | Victoria Rubin（β Ver AvatarSample_4） | 15.5 MB | ブロンド・垂れ目・上品・well educated | 不採用（洋風で 10代感が弱め、上品過ぎ） |
| 3 | Vivi（β Ver AvatarSample_2） | 18.1 MB | ブラウンのボブ・丸目・末っ子の甘えん坊 | 不採用（可愛いが知的・落ち着いた印象から外れる） |

最大の差は「知的で落ち着いた」＋「10代少女」＋「派手すぎない衣装」の同時成立。
Victoria は大人っぽい洋風、Vivi は幼めでやや子どもっぽいため、Shibu が最適。

---

## 不採用候補（前 PR の記録）

### Lydia（100Avatars R1, Avatar 054）— **不採用（表情 blendshape 欠損のため）**

| 項目 | 値 |
|------|----|
| 作者 | Polygonal Mind |
| 配布元 | [ToxSam/open-source-avatars](https://github.com/ToxSam/open-source-avatars) |
| ライセンス | CC0（VRM meta、registry 共に一致） |
| VRM サイズ | 1,507,976 bytes |

前 PR で一度採用したが、100Avatars R1 シリーズは VRoid Studio 非経由のパイプラインで、
VRM 標準感情プリセット `happy / angry / sad / relaxed / neutral / surprised` が**全欠損**。
口パク（`aa`）と瞬き（`blink`）のみ存在。感情タグ（calm / wry / pleased / scolding）が
顔に反映されないため、本 PR で VRoid 由来の Sendagaya Shibu に差し替えた。

### Rose / Jennifer（100Avatars R1 Avatar 057 / 052）

- 作者・ライセンス: Lydia と同じ Polygonal Mind / CC0。
- 同シリーズゆえ感情 blendshape も同様に欠損。本タスクの要件を満たさないため候補から除外。

### Xmas Chibi — Elel Silverbell（VIPE, 検証のみ）

- レジストリ記載ライセンス CC0 だが VRM 内 meta.licenseName = `Redistribution_Prohibited` という重大矛盾。
- 前 PR で即却下済み。再配布を禁止する可能性が高く、本 PR でも採用しない。

---

## 旧 placeholder の扱い

`avatars/companion.vrm` にはこれまで（Phase 4-0 初期）three-vrm の
`VRM1_Constraint_Twist_Sample.vrm`（pixiv Inc., 2022）が置かれていた。
`scripts/download-avatar.mjs` が取得する placeholder。本タスクで
Sendagaya Shibu に置換。ダウンロードスクリプトは残置（自作 VRM を
入れる場合のフォールバックとして）。

---

## ツール

- `scripts/inspect-vrm.mjs` — VRM の GLB JSON チャンクをダンプし、
  ライセンスメタ・humanoid bones・expression プリセットの過不足を
  レポートする。新しい候補を検討する際はまずこれに通す。
  
  ```bat
  node scripts\inspect-vrm.mjs avatars\candidates\*.vrm
  ```

- `avatars/candidates/` は `.gitignore` で除外済み。候補比較用の
  ダウンロード置き場なので PR には含めない。
