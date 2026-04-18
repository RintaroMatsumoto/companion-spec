# companion-spec

A Claude plugin that authors and packages hardware-neutral AI companions.

One persona, many surfaces: text chat today, VR headset tomorrow, AR glasses the day after. `companion-spec` lets you design an AI partner once — personality, voice, appearance, memory — and deploy the same being across every device that will carry it.

## Status

**Pre-release.** This repository contains the early specification and design sketches. No skills are implemented yet. See [`docs/COMPANION_SPEC_PLAN.md`](docs/COMPANION_SPEC_PLAN.md) for the strategic plan and [`DESIGN.md`](DESIGN.md) for the evolving technical design.

Public release is targeted for Phase 4 of the author's plugin portfolio (roughly 2027 Q1). The repository is published now to capture thinking while the vision is fresh.

## The six layers of a companion

A complete AI companion is more than a chat prompt. `companion-spec` treats a companion as six orthogonal layers, each packaged as a portable artifact:

| Layer       | Artifact                    | What it defines                             |
| ----------- | --------------------------- | ------------------------------------------- |
| Appearance  | `avatar.glb`                | 3D model, rig, animation style              |
| Voice       | `voice.onnx` (or config)    | TTS model, pitch, pacing, emotion           |
| Personality | `persona.yaml`              | Character traits, values, speech habits     |
| Memory      | `memory.db`                 | Past conversations, preferences, promises   |
| Senses      | `senses.yaml`               | How the companion interprets camera / env  |
| Runtime     | `runtime/<target>.adapter`  | Platform glue for VR, AR, mobile, text     |

The goal: you export a single `.companion` bundle, and any runtime adapter can load it. A companion built for text chat can later gain a body when the hardware arrives.

## Why this exists

Every major AI companion today is trapped on one platform. A character you build in Character.ai cannot walk into VRChat. A persona you train on OpenAI cannot appear on your Meta Ray-Ban glasses. There is no portable, open specification for the being itself.

This plugin attempts that specification, from the Claude side.

## Planned skills

- `companion-new` — interactive design dialog that produces a `persona.yaml` and starter bundle
- `companion-voice` — hooks an open TTS model into the voice layer
- `companion-avatar` — generates or imports a rigged avatar
- `companion-memory` — schema for long-term memory with privacy controls
- `companion-deploy` — packages the bundle for a target runtime (Quest / AR / text)
- `companion-audit` — reviews a companion against ethical guidelines

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Early contributors welcome, especially for avatar rigging, voice model integration, and runtime adapters for specific headsets.

## License

MIT. See [`LICENSE`](LICENSE).

## Related

This plugin is Phase 4 of a broader plugin portfolio. The three earlier pillars:

- [`programmatic-video-gen`](https://github.com/RintaroMatsumoto/programmatic-video-gen) — narrated explainer video pipeline
- [`arxiv-research-toolkit`](https://github.com/RintaroMatsumoto/arxiv-research-toolkit) — academic paper search, summary, and lit-review
- `notion-plugin` — Notion workspace automation (private until v0.1)
