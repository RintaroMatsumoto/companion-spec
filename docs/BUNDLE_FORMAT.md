# `.companion` バンドル仕様 v0

一つのファイルに、コンパニオンを構成する六層のうち「**見た目・声・口調**」を束ねる。
残り三層（記憶・感覚・ランタイム）はホスト側（Cowork / plugin）が管理する。

## 形式

拡張子 `.companion` は通常の **zip** である。内部レイアウト：

```
my-persona.companion
├── manifest.json          # 必須。メタデータ
├── avatar.vrm             # 必須。VRM 0.x / 1.0 どちらでも可
├── persona.md             # 任意。system-prompt 片、Claude 側が読む
├── voice.json             # 任意。声の詳細チューニング（将来）
└── assets/                # 任意。追加素材（テクスチャ差し替え等）
```

## manifest.json

```json
{
  "name": "sample-persona",
  "version": "0.1.0",
  "schema": "companion-spec/0",
  "avatar": "avatar.vrm",
  "voice": {
    "engine": "voicevox",
    "speaker": 8,
    "speedScale": 1.0,
    "pitchScale": 0.0
  },
  "traits": ["calm", "literary", "wry"],
  "signaturePhrases": ["ふむ", "なるほど", "悪くない"],
  "persona": "persona.md"
}
```

| フィールド | 必須 | 説明 |
| --- | --- | --- |
| `name` | ✅ | 人間可読名。ランチャーやログに出る |
| `version` | ✅ | SemVer |
| `schema` | ✅ | 現状 `companion-spec/0` 固定 |
| `avatar` | ✅ | VRM ファイルの zip 内パス |
| `voice.engine` | ✅ | 現在は `voicevox` のみ |
| `voice.speaker` | ✅ | エンジン内 speaker id |
| `traits` | 任意 | 口調タグ（narrator skill 参考用） |
| `signaturePhrases` | 任意 | よく使う相槌。tone guide |
| `persona` | 任意 | persona.md の zip 内パス |

## persona.md（推奨）

Claude に読ませる口調・自己認識の断片。例：

```markdown
# SamplePersona

- 一人称：私（わたくし）
- 二人称：あなた
- 口調：冷静沈着・知的・文学的、時折ウィット
- 関係性：対等なパートナー、導き手

応答は短く端的に。求められた以上のことは書かない。
```

## バリデーション

- zip を展開し、`manifest.json` が無ければ不正
- `manifest.schema` が `companion-spec/0` 以外なら不正
- `avatar` パスにファイルが存在しなければ不正
- `voice.speaker` が数値でなければ不正

## ランタイム挙動

1. ホスト（plugin MCP の `companion_load_persona`）が `.companion` 絶対パスをランナーに POST
2. ランナーが zip を `state/persona/` に展開
3. `avatar.vrm` を `avatars/current.vrm` にコピー（静的配信）
4. `currentPersona` を更新し、WebSocket で `{type:"persona", avatarUrl, speaker}` を全クライアントにブロードキャスト
5. ブラウザは現在の VRM を破棄して新しい `avatarUrl` を読み込み直す
6. 以後の `/say` 合成は新しい speaker id を使う

## 作り方（ユーザ向け）

1. 好きな VRM を用意（VRoid Studio で自作、Hub から DL、等）
2. `manifest.json` と `persona.md` を手書き
3. zip にまとめて拡張子を `.companion` に変更

将来的には `/commands/companion.md` のスラッシュコマンドから雛形生成をサポート予定。
