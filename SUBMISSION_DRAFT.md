> これは Anthropic の Claude Plugins 公式ディレクトリ提出フォームに手動で貼り付けるためのドラフトである。各フィールドはフォーム項目に 1:1 対応している。
>
> 提出順の推奨: **4 番目（保留）**。`companion-narrator` が実動作する v0.1.0（`companion-new` + text runtime + `companion-audit`）を出してから提出すること。

---

## companion-spec

- **Plugin name** (kebab-case): companion-spec
- **Public repository URL**: https://github.com/RintaroMatsumoto/companion-spec
- **Latest tag**: タグ未発行 (version: 0.0.1-design)
- **Author**: Rintaro Matsumoto
- **License**: MIT
- **Homepage**: https://github.com/RintaroMatsumoto/companion-spec
- **Category (candidate)**: creative — the artifact is a persona-bundle specification for AI companions across text, VR, and AR surfaces; the closest public category is creative tooling (persona authorship), not dev or productivity.
- **Keywords (5-8)**: ai-companion, specification, persona, portable, vrm, voicevox, webxr, quest

### Short tagline (<=60 chars, English)
One persona, many surfaces: a portable AI-companion spec.

### Description (plain English, ~450 chars)
A portable, hardware-neutral specification for AI companions. A companion authored once is expressed as a `.companion` bundle: a zip of six orthogonal layers (appearance, voice, personality, memory, senses, runtime) that any conforming runtime adapter can instantiate. This repository holds the specification, ethics policy, bundle schema, a desktop prototype exercising the voice/avatar/runtime slice, and the reference skills that will author and audit bundles. The goal is to make a persona outlive any single platform: text today, VR and AR tomorrow. `companion-narrator` is the first skill; more land as they pass the ethics review.

### Differentiators (3, English)
- Platform-independent by construction: the persona is the artifact, the runtime is swappable. No vendor lock-in to one chat service or headset.
- Six-layer orthogonal schema (appearance, voice, personality, memory, senses, runtime) lets authors iterate on one dimension without breaking others.
- Ethics policy (`docs/ETHICS.md`) is a gating review that every skill must pass before landing, not an afterthought.

### Included skills (from plugin.json / skills/)
- companion-narrator - First reference skill; narrates a companion bundle's personality and voice layer for inspection.

### Reviewer trial path (<=5 lines)
1. `/plugin install companion-spec` (once a release exists).
2. Read `docs/SCHEMA.md` and `docs/ETHICS.md` for the bundle contract.
3. Say "narrate this companion bundle" against a sample `.companion`.
4. Inspect the desktop prototype under `prototypes/companion-desktop/` for the runtime slice.

### Notes / Caveats
- **Submission is premature.** The repository is at `0.0.1-design`: a specification, an ethics policy, a schema, a desktop prototype, and one reference skill (`companion-narrator`). There is no release tag and no text runtime yet.
- **Recommendation: submit only after cutting v0.1.0**, which per the roadmap means `companion-new` + a working text runtime + `companion-audit` all landed and exercised end-to-end. Submitting earlier will fail a functional-demo review.
- Skills will land incrementally as they pass `docs/ETHICS.md` review; no calendar date is promised.
