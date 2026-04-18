# CLAUDE.md — companion-spec

## セッション冒頭で必ず目を通すファイル

- [`docs/TOOLBOX.md`](docs/TOOLBOX.md) — three-vrm / VOICEVOX 運用規約と
  試行錯誤の蓄積。コードを触る前に読む。
- [`docs/adr/`](docs/adr/) — 重要決定の履歴。同じ問題で再度悩まないための
  アンカー。新規決定は必ず ADR として追記。
- [`docs/COMPANION_SPEC_PLAN.md`](docs/COMPANION_SPEC_PLAN.md) — 長期計画。
- [`docs/BUNDLE_FORMAT.md`](docs/BUNDLE_FORMAT.md) — `.companion` バンドル仕様。

## プロジェクト概要

ハードウェア中立な AI コンパニオンをオーサリング・パッケージングする
Claude プラグイン。一つの人格（外見・声・性格・記憶）を、テキストチャット／
VR／AR など複数のランタイムに展開するための共通フォーマットと、デスクトップ
ランナーを提供する。

## アーキテクチャ

```
Claude（Cowork の会話）
  → companion-narrator skill が必要に応じて companion_say を呼ぶ
  → MCP server (mcp/server.mjs) が /say を runner に転送
  → runner (prototypes/companion-desktop) が VOICEVOX で音声合成
  → Chrome app-mode の窓で VRM が口パク・表情・idle アニメ
```

## 作業ルール

- コードを変えたら、**その場で** TOOLBOX に所見を足す。
- 重要決定は ADR に残す（連番）。
- trial-and-error で "たぶんこう" を書かない。出典が出せない推測は
  "演繹（根拠 A／B／C）" と明記する。
- 英語圏の一次情報も必ず当たる。日本語圏のブログだけで済ませない。
