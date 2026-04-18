# DESIGN.md — companion-spec

**Version:** v0.2 (Draft)
**Status:** Expected to be stable at the level of *shape*. Field details may still move; see [`docs/SCHEMA.md`](docs/SCHEMA.md) for the authoritative field list.

---

## 1. Problem statement

AI companions today are **platform-captured**. A persona authored on one service cannot be moved to another. A companion you trust on your phone cannot follow you into VR. When the platform shuts down, the being dies with it.

`companion-spec` treats the being as primary and the platform as disposable. You author once, deploy anywhere, and retain ownership of the bundle.

---

## 2. Architectural overview

```
                         +---------------------------+
                         |     .companion bundle     |
                         |  (zip, user-owned)        |
                         |                           |
                         |  manifest.json            |
                         |    |                      |
                         |    +-- persona.yaml       |
                         |    +-- voice.*            |
                         |    +-- avatar.glb         |
                         |    +-- senses.yaml        |
                         |    +-- memory/            |
                         |    +-- runtime/*.adapter  |
                         +------------+--------------+
                                      |
             +------------------------+------------------------+
             |                        |                        |
     +-------v-------+        +-------v-------+        +-------v-------+
     |  text adapter |        | quest adapter |        | webxr adapter |
     |  (CLI/Claude) |        |  (Unity/Quest)|        |  (browser XR) |
     +---------------+        +---------------+        +---------------+
```

Three observations:

1. The bundle is the **contract**. Adapters do not define companions; they render them.
2. Adapters are intentionally **thin**. Anything that would be platform-specific belongs in the adapter; anything that would be persona-specific belongs in the bundle.
3. The user controls the bundle file. It is not a cloud resource by default.

---

## 3. The six-layer model

A complete companion is described by six orthogonal layers. Orthogonality is the design goal: one should be able to change the voice without touching the personality, and change the runtime without touching either.

| Layer       | Artifact                    | Purpose                                                              |
|-------------|-----------------------------|----------------------------------------------------------------------|
| Appearance  | `avatar.glb`                | How the companion is seen                                            |
| Voice       | `voice.*`                   | How the companion is heard                                           |
| Personality | `persona.yaml` + prompts    | Who the companion is                                                 |
| Memory      | `memory/`                   | What the companion remembers, with sharing and category scoping      |
| Senses      | `senses.yaml`               | How the companion interprets the world (camera / microphone / env)   |
| Runtime     | `runtime/<target>.adapter`  | How the companion is wired into a platform                           |

Detailed field specifications live in [`docs/SCHEMA.md`](docs/SCHEMA.md).

### 3.1 Why these six?

They were chosen because changing any one of them leaves the others intelligible:

- Swap the avatar, keep everything else: the companion looks different but is the same being.
- Swap the voice, keep the persona: familiar character, new timbre.
- Swap the runtime, keep all the rest: the companion moves devices.
- Swap the persona, keep the avatar/voice/memory/senses: *this is a new companion*. The continuity breaks, by design.

Layers that fail the orthogonality test (for example, "emotion" as a seventh layer) are pushed into the layer they actually belong to. Emotion vocabulary lives on `persona.yaml` and is mapped by `voice` and `avatar`.

---

## 4. Bundle structure

```
my-companion.companion/          # .companion is a zip
  manifest.json                  # single source of truth
  persona.yaml
  prompts/
    persona.md                   # system-prompt template
    safety_preamble.md           # required, cannot be overridden at runtime
  voice.onnx                     # embedded mode
  voice-config.yaml              # or hosted-mode pointer
  avatar.glb
  senses.yaml
  memory/
    schema.sql
    seed.jsonl
  runtime/
    text.adapter.yaml
    quest.adapter.yaml
    webxr.adapter.yaml
  resources/
    crisis_ja-JP.yaml            # locale-specific crisis resources
    crisis_en-US.yaml
```

The manifest's `layers` tree is the **only** way a runtime discovers bundle contents. No adapter is permitted to glob the zip and guess. This keeps bundle editing predictable: moving a file means updating the manifest; otherwise the runtime fails loudly.

---

## 5. The manifest

The manifest (`manifest.json`) carries:

- **Identity** — `bundle_id` (UUID), `name`, `version`, `authors`.
- **Locale** — default and supported locales.
- **Layer pointers** — paths and SHA-256 hashes.
- **Audit state** — last pass timestamp, ETHICS policy version, strict flag.
- **Consent log** — append-only record of every user override of a safe default.
- **Signature** _(planned)_ — ed25519 signature of the manifest, for marketplace trust.

The consent log is load-bearing: it is the evidence that the user, not a skill, chose to widen a privacy boundary. `companion-audit` reads it when deciding whether a sensitive-category memory write is permitted.

Full field list: [`docs/SCHEMA.md` §1](docs/SCHEMA.md).

---

## 6. Runtime adapter contract

A runtime adapter is a thin piece of code that knows how to:

1. Unzip and verify a `.companion` bundle.
2. Read the manifest.
3. Resolve each layer file.
4. Construct a system prompt by concatenating `safety_preamble.md` then the rendered `persona.md`.
5. Serve the companion on its platform (terminal, Unity scene, WebXR scene, etc.).
6. Surface crisis hand-off messages verbatim.
7. Honour `memory.default_sharing` on every write.
8. Expose reset / export commands to the user.

An adapter is **conforming** if it satisfies all of the above. Conformance is what makes a bundle portable; non-conforming adapters erode the promise.

### 6.1 MVP adapters

- **text.adapter** — terminal + Claude chat. Reference implementation for v0.1.
- **quest.adapter** — Unity project template that loads the bundle at runtime. v0.3.
- **webxr.adapter** — browser WebXR scene. v0.3.

### 6.2 Thinness budget

Any adapter whose code exceeds ~2000 lines of platform-specific glue is probably pulling work that should live in the bundle. This is a heuristic, not a rule, but it is the intended direction.

---

## 7. Skill surfaces

The skills that ship from `companion-spec` operate on the bundle, not on live runtimes.

| Skill               | Phase | What it does                                                 | Reads              | Writes                       |
|---------------------|-------|--------------------------------------------------------------|--------------------|------------------------------|
| `companion-new`     | v0.1  | Interactive dialog → `persona.yaml` + bundle skeleton        | user answers       | new bundle                   |
| `companion-deploy`  | v0.1  | Package a bundle for a runtime target                        | existing bundle    | rewritten manifest + zip     |
| `companion-audit`   | v0.1  | Static ethical check against [`ETHICS.md`](docs/ETHICS.md)   | bundle             | stdout + `manifest.audit`    |
| `companion-voice`   | v0.2  | Attach an open TTS model to the voice layer                  | model file + cfg   | `voice-config.yaml` + asset  |
| `companion-avatar`  | v0.2  | Generate or import a 3D avatar                               | VRM or generator   | `avatar.glb`                 |
| `companion-memory`  | v0.2  | Configure memory schema + sharing defaults                   | user answers       | `memory/schema.sql`, manifest |

Skills have no knowledge of any particular runtime. Every skill is a bundle transformation.

---

## 8. Ethical boundaries

This plugin sits at the intersection of AI companionship and human relationship, which is a zone that rewards caution. The full policy lives in [`docs/ETHICS.md`](docs/ETHICS.md). The design-level implications are:

1. Every bundle must carry a `safety_preamble.md` that runtime adapters **must** prepend and **cannot** override from user prompts.
2. Every sensitive memory write must go through the `sharing` + `category` + `consent_log` path.
3. The minor-safety profile is automatic, not opt-in.
4. `companion-audit` is a gate, not a suggestion.

Features that cannot be expressed under these constraints are dropped, not worked around.

---

## 9. Non-goals

`companion-spec` is not:

- a chatbot framework (Claude, etc. are the model layer; we wrap them)
- a VR social platform (platforms like VRChat remain where people go to meet)
- a TTS research project (we consume existing open engines)
- an avatar creation tool (VRoid Studio et al. exist)
- a replacement for human relationships (see [`docs/ETHICS.md`](docs/ETHICS.md))

Keeping the scope narrow is what makes the spec portable.

---

## 10. MVP scope (v0.1.0)

The first shippable release contains only three skills and one runtime:

1. `companion-new`
2. `companion-deploy text`
3. `companion-audit`
4. `text.adapter` reference implementation

Avatar, voice, and VR/AR runtime adapters are out of scope for v0.1. They arrive in v0.2 and v0.3.

Rationale: shipping the text runtime alone validates the *hardest* part of the spec — personality, memory, senses, audit, manifest integrity — without letting 3D rendering distract from it. The avatar and voice layers are structurally simpler; they can be added once the core contract is stable.

---

## 11. Open questions

Tracked in [`docs/ISSUES_SEED.md`](docs/ISSUES_SEED.md). A short selection:

- Should the manifest be signed, and under whose key?
- Is VRM the right avatar floor, or should the spec be format-agnostic with a converter layer?
- What is the canonical memory portability format across SQLite variants? (`.db` file? SQL dump? JSONL export?)
- How does a user edit a bundle safely across versions? (`companion-migrate` skill?)
- How do we express "two bundles are sibling versions of the same companion"? (Bundle lineage field?)

---

## 12. References

- [`docs/COMPANION_SPEC_PLAN.md`](docs/COMPANION_SPEC_PLAN.md) — strategic context and timeline
- [`docs/SCHEMA.md`](docs/SCHEMA.md) — field-by-field schema
- [`docs/ETHICS.md`](docs/ETHICS.md) — policy contract
- [`docs/ISSUES_SEED.md`](docs/ISSUES_SEED.md) — open questions

---

## 13. Change log

| Date       | Version | Change                                                        |
|------------|---------|---------------------------------------------------------------|
| 2026-04-18 | v0.1    | Initial sketch (six-layer model, bundle outline).             |
| 2026-04-19 | v0.2    | Full architectural overview, manifest detail, adapter contract, skill surfaces, MVP rationale. Schema details moved to `docs/SCHEMA.md`. |
