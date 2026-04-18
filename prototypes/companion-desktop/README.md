# companion-desktop — Phase 4-0 先行プロトタイプ

`companion-spec` の学習用アーティファクト。出荷物ではなく、
「ハードウェア中立な AI コンパニオン」という仕様が本当に意味を
持つのかをデスクトップ上で体感するための実験装置です。

- **Phase**: 4-0（設計スケッチ / プロトタイプ期）
- **対象言語**: 日本語のみ（MVP）
- **声**: VOICEVOX／春日部つむぎ（ノーマル）
- **ボディ**: VRM + Three.js（ブラウザ内描画）
- **表示形態**: Chrome の app-mode ウィンドウで透明背景描画

> このプロトタイプは `companion-spec` v0.1.0 には同梱しません。
> 六層モデル（Appearance / Voice / Personality / Memory / Senses / Runtime）の
> うち **Appearance・Voice・Runtime** だけを最小限で繋いだものです。

---

## 前提

1. **Node 18+** が PATH に通っていること
2. **VOICEVOX** がローカルで起動し `http://127.0.0.1:50021` で待受していること
   （公式エディタを起動しておけば OK）
3. **Google Chrome** がインストールされていること
4. **VRM アバター** — `avatars/companion.vrm` に配置する
   （自動ダウンロードでサンプルを取得可能）

---

## セットアップ

```bat
cd prototypes\companion-desktop
npm install
node scripts\download-avatar.mjs     :: サンプル VRM を取得
```

自作 VRM を使う場合は `avatars/README.md` を参照。VRoid Studio で
作成した `*.vrm` を `avatars/companion.vrm` に置けば差し替え完了です。

---

## 起動

```bat
scripts\launch.bat
```

これが：

1. VOICEVOX 到達性をチェック
2. `npm install` 未実行なら実行
3. `avatars/companion.vrm` 未取得ならダウンロード
4. Node サーバを起動（別ウィンドウ）
5. Chrome を app-mode で開く（480×720）

---

## しゃべらせる

別のコマンドプロンプトから：

```bat
scripts\say.bat "こんばんは。"       calm
scripts\say.bat "……そうですか。"    wry
scripts\say.bat "よくやりました。"  pleased
scripts\say.bat "それは違います。"  scolding
```

または直接 HTTP で：

```bash
curl -X POST http://localhost:5173/say \
  -H "Content-Type: application/json" \
  -d '{"text":"今日も一日、お疲れさまでした。","emotion":"calm"}'
```

---

## アーキテクチャ

```
┌─────────────────┐        HTTP         ┌─────────────┐
│ caller (CLI or  │ ─────── POST /say ─▶│  Node 5173  │
│  Claude plugin) │                     │  (Express)  │
└─────────────────┘                     └──────┬──────┘
                                               │ audio_query
                                               │ /synthesis
                                         ┌─────▼──────┐
                                         │  VOICEVOX  │
                                         │  127.0.0.1 │
                                         │   :50021   │
                                         └─────┬──────┘
                                               │ WAV buffer
                                    ┌──────────▼──────────┐
                                    │  WebSocket broadcast │
                                    │  {audio, emotion}    │
                                    └──────────┬──────────┘
                                               │
                                   ┌───────────▼───────────┐
                                   │  Chrome (app mode)    │
                                   │  Three.js + three-vrm │
                                   │  - lip sync (RMS)     │
                                   │  - emotion blendshape │
                                   │  - blink timer        │
                                   └───────────────────────┘
```

### エンドポイント

| Method | Path       | 内容 |
|--------|------------|------|
| GET    | `/`        | UI (public/index.html) |
| GET    | `/avatars/:file` | VRM 静的配信 |
| GET    | `/health`  | `{ server, voicevox }` |
| POST   | `/say`     | `{ text, emotion?, speaker? }` → WS 配信 |
| WS     | `/ws`      | `{type:"say", audio(base64), mime, emotion, text}` |

### 感情タグ → VRM 表情マッピング

| emotion   | happy | angry | relaxed | neutral |
|-----------|:-----:|:-----:|:-------:|:-------:|
| calm      | 0.0   | 0.0   | 0.3     | 0.5 |
| wry       | 0.25  | 0.0   | 0.4     | 0.2 |
| pleased   | 0.7   | 0.0   | 0.2     | 0.0 |
| scolding  | 0.0   | 0.55  | 0.0     | 0.2 |

---

## 既知の制約（Phase 4-0 として許容するもの）

- **AutoPlay 制限**: 初回は Chrome ウィンドウ内を一度クリックしないと
  音声が鳴らない（Web Audio の仕様）
- **口パク精度**: 単純な振幅ベース（母音分離なし）
- **Memory 層なし**: `companion-spec` の永続記憶・プライバシー制御は未実装
- **Senses 層なし**: マイク入力・画面認識なし
- **Personality 層は外注**: 文章生成は呼び出し側（Claude 本体）の役割。
  ここはあくまで「声と体」の出力装置
- **アバターは仮**: 初期は three-vrm サンプル。VRoid Studio で
  衣装・髪型を作り込むのは別タスク

---

## 今後この実験から `companion-spec` 本体へ持ち帰るもの

- 感情タグの語彙（最終的に `persona.yaml` の expressions に取り込む）
- WebSocket メッセージ形式（ランタイムアダプタの抽象化のヒント）
- 「アバターと声を差し替えれば人格は別物になる」という実証
- 逆に「感情語彙と声音だけでは人格は作れない」という負の実証

---

**Position**: これは v0.1.0 の一部ではなく、v0.1.0 を**書く前に**
自分の手を動かすための工作物です。半年後に恥ずかしくなったら、
そのときは恥ずかしさごと設計書に反映させます。
