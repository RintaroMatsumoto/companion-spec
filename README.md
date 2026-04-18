# companion-spec

> One persona, many surfaces. Today text, tomorrow VR, the day after AR glasses.

`companion-spec` is a Claude plugin that defines a **portable, hardware-neutral specification** for AI companions. A companion you design once is expressed as a `.companion` bundle — a zip archive of six orthogonal layers (appearance, voice, personality, memory, senses, runtime) — and any conforming runtime adapter can bring it to life.

This repository holds the specification, the reference skills that will author and audit bundles, and the research that backs the design. It does **not** ship a specific companion. Your persona belongs to you.

---

## Status

**Phase 4-0 — specification and early implementation.** The repository currently holds:

- the strategic plan — [`docs/COMPANION_SPEC_PLAN.md`](docs/COMPANION_SPEC_PLAN.md)
- the technical design — [`DESIGN.md`](DESIGN.md)
- the ethics policy — [`docs/ETHICS.md`](docs/ETHICS.md)
- the bundle schema — [`docs/SCHEMA.md`](docs/SCHEMA.md)
- seed issues for unsolved design questions — [`docs/ISSUES_SEED.md`](docs/ISSUES_SEED.md)
- a desktop prototype that exercises the voice / avatar / runtime slice — [`prototypes/companion-desktop/`](prototypes/companion-desktop/)

Skills under `skills/` will land as they pass [`docs/ETHICS.md`](docs/ETHICS.md) and match the schema in [`docs/SCHEMA.md`](docs/SCHEMA.md). No skill is promised on a calendar date.

Version milestones (scope, not dates — shipped when ready):

| Version   | Scope                                                          |
|-----------|----------------------------------------------------------------|
| v0.1.0    | `companion-new` + text runtime + `companion-audit`             |
| v0.2.0    | `companion-voice` + `companion-avatar`                         |
| v0.3.0    | `quest.adapter` + `webxr.adapter`                              |

---

## Why this exists

Every mainstream AI companion today is **platform-captured**. A persona you raise on Character.ai cannot follow you into VRChat. A voice you cultivate on one service cannot move to Meta Ray-Ban. When the platform shuts down, the being dies with it.

`companion-spec` inverts the relationship: the companion is primary, the platform is disposable. You author once, carry the bundle with you, and plug it into whatever device the next decade happens to invent.

For the full argument, see [`docs/COMPANION_SPEC_PLAN.md`](docs/COMPANION_SPEC_PLAN.md).

---

## The six-layer bundle

A complete companion is described by six orthogonal layers, each serialised to a well-known artifact:

| Layer       | Artifact                    | What it defines                                |
|-------------|-----------------------------|------------------------------------------------|
| Appearance  | `avatar.glb`                | 3D model, rig, animation style                 |
| Voice       | `voice.onnx` (or config)    | TTS model, pitch, pacing, emotion range        |
| Personality | `persona.yaml`              | Character traits, values, speech habits        |
| Memory      | `memory/`                   | Schema + seed rows, with per-row sharing scope |
| Senses      | `senses.yaml`               | Rules for camera / microphone / environment    |
| Runtime     | `runtime/<target>.adapter`  | Platform glue (text, Quest, WebXR, ...)        |

The physical layout of a `.companion` zip is:

```
my-companion.companion/
  manifest.json          # version, name, pointers, integrity hashes
  persona.yaml
  voice.onnx             # or voice-config.yaml
  avatar.glb
  senses.yaml
  memory/
    schema.sql
    seed.jsonl
  runtime/
    text.adapter.yaml
    quest.adapter.yaml
    webxr.adapter.yaml
```

`manifest.json` is the single source of truth. Runtime adapters consume it, resolve each layer, and wire the companion into their platform.

Full schema: [`docs/SCHEMA.md`](docs/SCHEMA.md).

---

## Planned skills

| Skill               | Role                                                           | Target |
|---------------------|----------------------------------------------------------------|--------|
| `companion-new`     | Interactive authoring of `persona.yaml` + bundle skeleton      | v0.1   |
| `companion-deploy`  | Package a bundle for a specific runtime (text only in v0.1)    | v0.1   |
| `companion-audit`   | Static ethical check of a bundle                               | v0.1   |
| `companion-voice`   | Attach an open TTS model as the voice layer                    | v0.2   |
| `companion-avatar`  | Generate or import a 3D avatar                                 | v0.2   |
| `companion-memory`  | Design memory schema and privacy controls                      | v0.2   |

The table is a promise about scope, not a claim about the present.

---

## Prototype: `companion-desktop`

A small desktop experiment under [`prototypes/companion-desktop/`](prototypes/companion-desktop/) wires VOICEVOX (voice) + VRM + Three.js (appearance) + a thin Node runtime (runtime) together. It exists to answer one question: does the "appearance + voice + runtime, with personality left to the caller" slice feel like a coherent companion in practice?

It is not part of the v0.1.0 surface, but it feeds directly into the specification work.

---

## Design principles

1. **Portability.** The bundle is self-contained and loadable by any conforming adapter.
2. **User ownership.** Bundles live on the user's machine. No vendor lock-in.
3. **Ethical framing.** Companions catalyse human connection rather than replace it. See [`docs/ETHICS.md`](docs/ETHICS.md).

---

## Reading order

For reviewers, read in this order:

1. [`docs/COMPANION_SPEC_PLAN.md`](docs/COMPANION_SPEC_PLAN.md) — strategy and timeline
2. [`DESIGN.md`](DESIGN.md) — the six-layer architecture
3. [`docs/SCHEMA.md`](docs/SCHEMA.md) — concrete field definitions
4. [`docs/ETHICS.md`](docs/ETHICS.md) — constraints every bundle must satisfy
5. [`docs/ISSUES_SEED.md`](docs/ISSUES_SEED.md) — open design questions
6. [`CONTRIBUTING.md`](CONTRIBUTING.md) — how to help before there is code to write

---

## License

MIT. See [`LICENSE`](LICENSE).

---

## Related plugins (portfolio context)

This repository is the fourth arrow of a four-plugin portfolio. The three sibling pillars:

- [`programmatic-video-gen`](https://github.com/RintaroMatsumoto/programmatic-video-gen) — narrated explainer video pipeline
- [`arxiv-research-toolkit`](https://github.com/RintaroMatsumoto/arxiv-research-toolkit) — academic paper search, summary, and lit-review
- `notion-plugin` — Notion workspace automation

---

*A plan for the decade, built one piece at a time.*
