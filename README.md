# companion-spec

A Claude plugin that authors and packages hardware-neutral AI companions.

One persona, many surfaces: text chat today, VR headset tomorrow, AR glasses the day after. `companion-spec` lets you design an AI partner once — personality, voice, appearance, memory — and deploy the same being across every device that will carry it.

## Status

**v0.1.0 — first runnable slice.** Ships an end-to-end desktop companion: MCP tools, a narration skill, a `.companion` bundle format, and a local runner (VRM avatar + VOICEVOX voice + WebSocket bridge). Install the plugin, have VOICEVOX running, and Claude's replies start coming out of a floating window.

See [`docs/COMPANION_SPEC_PLAN.md`](docs/COMPANION_SPEC_PLAN.md) for the long-horizon plan, [`DESIGN.md`](DESIGN.md) for the evolving design, and [`docs/BUNDLE_FORMAT.md`](docs/BUNDLE_FORMAT.md) for the `.companion` spec.

## Quick start

1. `npm install` in `mcp/` and `prototypes/companion-desktop/` (or run `node mcp/bootstrap.mjs`).
2. Start VOICEVOX locally (default port 50021).
3. Install this repo as a plugin in Cowork.
4. In chat: `/companion launch` → a transparent window appears with the default avatar.
5. Talk. The `companion-narrator` skill routes spoken lines through `companion_say`.
6. Swap persona at any time: `/companion load C:\path\to\my-persona.companion`.

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

## Skills & tools

Shipping in v0.1.0:

- `companion-narrator` (skill) — tells Claude to route replies through `companion_say` when appropriate
- `/companion` (command) — launch / status / say / load
- MCP tools: `companion_launch`, `companion_status`, `companion_say`, `companion_load_persona`

Planned:

- `companion-new` — interactive design dialog that produces a `.companion` bundle
- `companion-voice` — hooks alternative TTS engines into the voice layer
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
