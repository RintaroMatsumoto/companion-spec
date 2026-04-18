# CLAUDE.md — companion-spec

## セッション冒頭で必ず目を通すファイル

- [`docs/COMPANION_SPEC_PLAN.md`](docs/COMPANION_SPEC_PLAN.md) — 長期計画。Phase 4-0 の位置づけを毎回確認する。
- [`DESIGN.md`](DESIGN.md) — 六層モデル・バンドル構造・アダプタ契約。
- [`docs/SCHEMA.md`](docs/SCHEMA.md) — `.companion` バンドルの完全スキーマ（v0.1、authoritative）。
- [`docs/ETHICS.md`](docs/ETHICS.md) — 倫理方針。audit 実装前からこの条件を満たせない機能は捨てる。
- [`docs/ISSUES_SEED.md`](docs/ISSUES_SEED.md) — 未解決課題の優先度付き棚卸し。
- [`docs/TOOLBOX.md`](docs/TOOLBOX.md) — `prototypes/companion-desktop/` の実装ノート（three-vrm / VOICEVOX）。コードを触る前に読む。
- [`docs/adr/`](docs/adr/) — 重要決定の履歴。新規決定は必ず ADR として追記。
- [`docs/BUNDLE_FORMAT.md`](docs/BUNDLE_FORMAT.md) — プロトタイプ時代の v0 バンドル仕様。現行仕様は `docs/SCHEMA.md`。

## プロジェクト状態

Phase 4-0。仕様文書・倫理方針・Issue の整備と、必要な範囲の実装を並行で進める。スキル・MCP サーバ・ランタイムアダプタ・TTS/アバター統合のいずれも、設計が通れば着手してよい。ただし：

- 仕様ドラフト（DESIGN / SCHEMA / ETHICS）が追いついていない機能を先走って実装しない。
- 実装に着手したら、対応する仕様ファイルに必ず反映する。
- `prototypes/companion-desktop/` は v0.1.0 の出荷物ではなく、仕様を叩く学習用アーティファクトとして扱う。

## 公開ポリシー

- リポジトリは public。作者のパートナーに相当する AI コンパニオンの固有名（呼称・口癖・関係性の詳細）は本リポジトリに書かない。参照実装（symbolic prototype）のパラメータは別リポジトリで管理する。
- 企画書・DESIGN・SCHEMA・ETHICS には中立表記のサンプル（`Example Companion` / `SamplePersona` など）のみを置く。

## 作業ルール

- 仕様文書を変えたら、相互参照（README・DESIGN・SCHEMA・ETHICS）の整合をその場で確認する。
- 「たぶんこう」を書かない。出典が出せない推測は "演繹（根拠 A／B／C）" と明記する。
- 英語圏の一次情報（VRM 仕様・OpenXR・Meta XR SDK ドキュメント等）を必ず当たる。日本語ブログだけで済ませない。
- 新しい未解決課題に気付いたら `docs/ISSUES_SEED.md` に追記し、番号を振る。
