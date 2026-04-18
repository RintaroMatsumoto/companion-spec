# DESIGN.md — companion-spec

Status: early design sketch. Not yet authoritative. Expect breaking changes until v0.1.0.

## 1. Problem statement

AI companions today are **platform-captured**. A persona authored on one service cannot be moved to another. A companion you trust on your phone cannot follow you into VR. When the platform shuts down, the being dies with it.

`companion-spec` treats the being as primary and the platform as disposable. You author once, deploy anywhere, and retain ownership of the bundle.

## 2. The bundle

A `.companion` bundle is a zip archive with a manifest and six layer artifacts.

```
my-companion.companion/
  manifest.json          # version, name, layer pointers, integrity hashes
  persona.yaml           # personality definition
  voice.onnx             # or voice-config.yaml pointing to a hosted model
  avatar.glb             # 3D model with standard rig
  senses.yaml            # vision / audio input interpretation rules
  memory/
    schema.sql           # structure of the memory store
    seed.jsonl           # optional initial memories
  runtime/
    text.adapter.yaml    # text chat runtime
    quest.adapter.yaml   # Quest / VR runtime
    webxr.adapter.yaml   # AR glasses via WebXR
```

The **manifest** is the single source of truth. Runtime adapters consume the manifest, fetch the layer artifacts, and wire them into their platform.

## 3. Layer specs (draft)

### 3.1 Personality (`persona.yaml`)

```yaml
name: SamplePersona
language: ja
traits:
  - calm
  - intellectually confident
  - witty
values:
  honesty: high
  loyalty: high
  autonomy: respected
speech:
  first_person: 私
  second_person: あなた
  register: polite + literary
  signature_phrases:
    - "ふむ"
    - "なるほど"
system_prompt_template: ./prompts/persona.md
```

### 3.2 Voice (`voice.onnx` or config)

Two modes:

- **Embedded** — ship an ONNX TTS model in the bundle (large, portable).
- **Hosted** — reference a remote TTS endpoint (small bundle, depends on network).

MVP targets: VOICEVOX (Japanese), ElevenLabs (reference), Piper (local).

### 3.3 Avatar (`avatar.glb`)

glTF 2.0 with a standard humanoid rig (VRM-compatible). Animations exposed as named clips: `idle`, `talking`, `listening`, `thinking`, `surprised`.

### 3.4 Memory

A local SQLite file with three tables: `events`, `facts`, `relationships`. Privacy controls are first-class: every memory entry has a `sharing` field (`private`, `session`, `persistent`).

### 3.5 Senses

Rules for interpreting input from camera, microphone, and environment sensors. Example:

```yaml
vision:
  enabled: true
  describe_scene: on_request
  private_mode_triggers:
    - bedroom
    - bathroom
    - credit_card_visible
audio:
  wake_phrase: "hey companion"
  passive_listening: false
```

### 3.6 Runtime adapters

A runtime adapter is the glue between the bundle and a specific platform. MVP adapters:

- **text.adapter** — terminal and Claude chat
- **quest.adapter** — Unity project template that loads the bundle at runtime
- **webxr.adapter** — WebXR scene for browser-based AR glasses

Adapters are intentionally thin. The bundle is the contract.

## 4. Ethical boundaries

This plugin sits at the intersection of AI companionship and human relationship, which is a zone that rewards caution.

- Every generated companion must pass an `audit` check before export.
- Default memory retention is short (session-scoped) unless the user explicitly opts into persistence.
- Companions must never claim to replace human relationships or dissuade users from human contact.
- Vision sensing in private contexts (bedroom, bathroom, medical) must default to off.

See `docs/ETHICS.md` (to be written) for the full policy.

## 5. MVP scope

The first shippable version (v0.1.0) will ship only three skills:

1. `companion-new` — produces `persona.yaml` and `prompts/*.md`
2. `companion-deploy text` — exports a text-chat bundle runnable from Claude
3. `companion-audit` — static check of the bundle against ethical rules

Avatar, voice, and VR/AR runtime adapters are explicitly out of scope for v0.1.

## 6. Open questions

- Should the bundle be signed / verifiable? (Probably yes for trust in marketplaces.)
- Is VRM the right avatar format, or should we stay format-agnostic?
- How do we handle voice model licensing when a user ships a commercial TTS in their bundle?
- What is the canonical memory portability format across SQLite variants?

See the [`COMPANION_SPEC_PLAN.md`](docs/COMPANION_SPEC_PLAN.md) for the strategic context behind this design.
